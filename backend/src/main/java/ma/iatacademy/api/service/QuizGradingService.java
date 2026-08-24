package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.EssayGrade;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.quiz.GradeEssayRequest;
import ma.iatacademy.api.dto.quiz.PendingReviewAttemptResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.EssayGradeRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Correction manuelle des questions ouvertes (ESSAY) — extrait de QuizService. Finalise le
 * score de la tentative dès que toutes les questions ouvertes sont corrigées, en déléguant
 * les effets de bord (badge, certificat, notification) à QuizAttemptService, qui possède
 * déjà cette logique pour la soumission directe.
 */
@Service
@RequiredArgsConstructor
public class QuizGradingService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final QuestionRepository questionRepository;
    private final EssayGradeRepository essayGradeRepository;
    private final UserRepository userRepository;
    private final ProgressionService progressionService;
    private final QuizAttemptService quizAttemptService;

    /** Corrige une question ouverte d'une tentative ; finalise le score dès que toutes les questions ESSAY sont notées. */
    @Transactional
    public void gradeEssay(UUID attemptId, UUID questionId, GradeEssayRequest request, UUID graderId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new NotFoundException("Tentative introuvable."));
        if (attempt.getStatus() != AttemptStatus.PENDING_REVIEW) {
            throw new ApiException("Cette tentative n'attend pas de correction.");
        }
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NotFoundException("Question introuvable."));
        if (question.getQuestionType() != QuestionType.ESSAY) {
            throw new ApiException("Seules les questions ouvertes se corrigent ici.");
        }
        EssayGrade grade = essayGradeRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
                .orElseGet(() -> EssayGrade.builder().attempt(attempt).question(question).build());
        grade.setScore(request.score());
        grade.setFeedback(request.feedback());
        grade.setGradedBy(userRepository.getReferenceById(graderId));
        grade.setGradedAt(Instant.now());
        essayGradeRepository.save(grade);

        finalizeIfFullyGraded(attempt);
    }

    @Transactional(readOnly = true)
    public List<PendingReviewAttemptResponse> listPendingReview(UUID quizId) {
        List<QuizAttempt> pending = quizId != null
                ? quizAttemptRepository.findByQuizIdAndStatusOrderBySubmittedAtAsc(quizId, AttemptStatus.PENDING_REVIEW)
                : quizAttemptRepository.findByStatusOrderBySubmittedAtAsc(AttemptStatus.PENDING_REVIEW);
        return pending.stream().map(this::toPendingReview).toList();
    }

    private PendingReviewAttemptResponse toPendingReview(QuizAttempt attempt) {
        Quiz quiz = attempt.getQuiz();
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId())
                .stream().collect(Collectors.toMap(Question::getId, q -> q));
        Map<UUID, EssayGrade> gradesByQuestion = essayGradeRepository.findByAttemptId(attempt.getId()).stream()
                .collect(Collectors.toMap(g -> g.getQuestion().getId(), g -> g));
        List<PendingReviewAttemptResponse.EssayAnswerToGrade> essayAnswers = attempt.getQuestionOrder().stream()
                .map(questionMap::get)
                .filter(q -> q != null && q.getQuestionType() == QuestionType.ESSAY)
                .map(q -> {
                    EssayGrade g = gradesByQuestion.get(q.getId());
                    String submitted = attempt.getFreeTextAnswers() == null ? null
                            : attempt.getFreeTextAnswers().get(q.getId().toString());
                    return new PendingReviewAttemptResponse.EssayAnswerToGrade(
                            q.getId(), q.getPrompt(), submitted,
                            g != null, g != null ? g.getScore() : null, g != null ? g.getFeedback() : null);
                })
                .toList();
        return new PendingReviewAttemptResponse(
                attempt.getId(), quiz.getId(), quiz.getTitle(),
                attempt.getUser().getId(),
                attempt.getUser().getFullName() != null ? attempt.getUser().getFullName() : attempt.getUser().getEmail(),
                attempt.getSubmittedAt(), essayAnswers);
    }

    private void finalizeIfFullyGraded(QuizAttempt attempt) {
        Quiz quiz = attempt.getQuiz();
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId())
                .stream().collect(Collectors.toMap(Question::getId, q -> q));
        List<UUID> essayIds = attempt.getQuestionOrder().stream()
                .filter(id -> questionMap.get(id) != null && questionMap.get(id).getQuestionType() == QuestionType.ESSAY)
                .toList();
        Map<UUID, EssayGrade> gradesByQuestion = essayGradeRepository.findByAttemptId(attempt.getId()).stream()
                .collect(Collectors.toMap(g -> g.getQuestion().getId(), g -> g));
        boolean allGraded = essayIds.stream().allMatch(gradesByQuestion::containsKey);
        if (!allGraded) {
            return;
        }

        boolean wasModuleCompleted = quiz.getModule() != null
                && progressionService.isModuleContentCompleted(attempt.getUser().getId(), quiz.getModule().getId());

        int correctAutoCount = 0;
        int autoGradableCount = 0;
        for (UUID qid : attempt.getQuestionOrder()) {
            Question q = questionMap.get(qid);
            if (q == null || q.getQuestionType() == QuestionType.ESSAY) {
                continue;
            }
            autoGradableCount++;
            if (isQuestionCorrect(q, attempt.getAnswers(), attempt.getFreeTextAnswers(), attempt.getStructuredAnswers())) {
                correctAutoCount++;
            }
        }
        double sumPercent = correctAutoCount * 100.0;
        for (EssayGrade g : gradesByQuestion.values()) {
            sumPercent += g.getScore().doubleValue();
        }
        int totalGradable = autoGradableCount + essayIds.size();
        BigDecimal finalScore = totalGradable == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(sumPercent / totalGradable).setScale(2, RoundingMode.HALF_UP);
        boolean passed = finalScore.compareTo(BigDecimal.valueOf(quiz.getPassingScore())) >= 0;

        attempt.setScore(finalScore);
        attempt.setStatus(passed ? AttemptStatus.PASSED : AttemptStatus.FAILED);
        quizAttemptRepository.save(attempt);

        quizAttemptService.applyPassEffects(attempt, quiz, attempt.getUser().getId(), wasModuleCompleted, passed, finalScore);
    }

    private boolean isQuestionCorrect(
            Question question,
            Map<String, List<String>> choiceAnswers,
            Map<String, String> freeTextAnswers,
            Map<String, Object> structuredAnswers
    ) {
        String qid = question.getId().toString();
        return switch (question.getQuestionType()) {
            case SINGLE_CHOICE, MULTI_CHOICE, TRUE_FALSE ->
                    isAnswerCorrect(question, choiceAnswers == null ? List.of() : choiceAnswers.getOrDefault(qid, List.of()));
            case ESSAY -> false;
        };
    }

    private boolean isAnswerCorrect(Question question, List<String> selectedRaw) {
        Set<UUID> selected = selectedRaw.stream()
                .filter(Objects::nonNull)
                .map(UUID::fromString)
                .collect(Collectors.toSet());
        Set<UUID> correct = question.getOptions().stream()
                .filter(AnswerOption::isCorrect)
                .map(AnswerOption::getId)
                .collect(Collectors.toSet());
        return selected.equals(correct);
    }
}
