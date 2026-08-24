package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.quiz.AiGenerationRequest;
import ma.iatacademy.api.dto.quiz.AiGenerationResponse;
import ma.iatacademy.api.dto.quiz.CreateOptionRequest;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.dto.quiz.QuestionAdminResponse;
import ma.iatacademy.api.dto.quiz.QuizAdminResponse;
import ma.iatacademy.api.dto.quiz.RowError;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Question CRUD within a quiz — extracted from QuizService (was 1009 lines covering quiz
 * lifecycle, attempts, grading, and questions all in one class). QuizService still owns the
 * public API surface (QuizController is unchanged) and delegates every question-related
 * call here.
 */
@Service
@RequiredArgsConstructor
public class QuestionService {

    private static final Set<QuestionType> CHOICE_TYPES =
            Set.of(QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE, QuestionType.TRUE_FALSE);

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuestionGenerationService questionGenerationService;
    private final RateLimitService rateLimitService;

    @Transactional
    public QuizAdminResponse addQuestion(UUID quizId, CreateQuestionRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));

        validateQuestionOptions(request);

        int nextOrder = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).size();
        Question question = Question.builder()
                .quiz(quiz)
                .prompt(request.prompt().trim())
                .questionType(request.questionType())
                .orderIndex(nextOrder)
                .explanation(request.explanation())
                .imageAssetId(request.imageAssetId())
                .metadata(request.metadata())
                .build();

        for (CreateOptionRequest opt : optionsOrEmpty(request)) {
            AnswerOption option = AnswerOption.builder()
                    .question(question)
                    .label(opt.label().trim())
                    .correct(Boolean.TRUE.equals(opt.correct()))
                    .orderIndex(opt.orderIndex())
                    .build();
            question.getOptions().add(option);
        }
        questionRepository.save(question);
        return toAdmin(quiz);
    }

    /** Génère des questions par IA et les ajoute au quiz via le même chemin qu'un ajout
     * manuel (addQuestion) — mêmes invariants, mêmes validations. Une question générée
     * qui échoue la validation est reportée en erreur plutôt que de faire échouer les autres. */
    @Transactional
    public AiGenerationResponse generateQuestionsAi(UUID quizId, AiGenerationRequest request, UUID actorId) {
        rateLimitService.checkAiGenerationAllowed(actorId.toString());
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        UUID lessonId = request.lessonId() != null
                ? request.lessonId()
                : (quiz.getLesson() != null ? quiz.getLesson().getId() : null);
        String sourceText = questionGenerationService.resolveSourceText(lessonId, request.rawText());
        List<CreateQuestionRequest> generated =
                questionGenerationService.generate(sourceText, request.questionType(), request.count());

        int success = 0;
        List<RowError> errors = new ArrayList<>();
        for (int i = 0; i < generated.size(); i++) {
            try {
                addQuestion(quizId, generated.get(i));
                success++;
            } catch (Exception e) {
                errors.add(new RowError(i + 1, e.getMessage()));
            }
        }
        return new AiGenerationResponse(success, errors);
    }

    @Transactional
    public QuestionAdminResponse updateQuestion(UUID quizId, UUID questionId, CreateQuestionRequest request) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NotFoundException("Question introuvable."));
        if (!question.getQuiz().getId().equals(quizId)) {
            throw new ApiException("La question n'appartient pas à ce quiz.");
        }
        validateQuestionOptions(request);

        question.setPrompt(request.prompt().trim());
        question.setQuestionType(request.questionType());
        question.setExplanation(request.explanation());
        question.setImageAssetId(request.imageAssetId());
        question.setMetadata(request.metadata());
        question.getOptions().clear();
        for (CreateOptionRequest opt : optionsOrEmpty(request)) {
            question.getOptions().add(AnswerOption.builder()
                    .question(question)
                    .label(opt.label().trim())
                    .correct(Boolean.TRUE.equals(opt.correct()))
                    .orderIndex(opt.orderIndex())
                    .build());
        }
        questionRepository.save(question);
        return toQuestionAdmin(question);
    }

    @Transactional
    public void deleteQuestion(UUID quizId, UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NotFoundException("Question introuvable."));
        if (!question.getQuiz().getId().equals(quizId)) {
            throw new ApiException("La question n'appartient pas à ce quiz.");
        }
        questionRepository.delete(question);
    }

    /** Duplique une question dans le même quiz — pratique pour partir d'une question proche. */
    @Transactional
    public QuestionAdminResponse duplicateQuestion(UUID quizId, UUID questionId) {
        Question source = questionRepository.findById(questionId)
                .orElseThrow(() -> new NotFoundException("Question introuvable."));
        if (!quizId.equals(source.getQuiz() != null ? source.getQuiz().getId() : null)) {
            throw new ApiException("La question n'appartient pas à ce quiz.");
        }
        int nextOrder = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).size();
        Question copy = cloneQuestion(source, nextOrder);
        copy.setQuiz(source.getQuiz());
        questionRepository.save(copy);
        return toQuestionAdmin(copy);
    }

    /** Fixe un nouvel ordre pour les questions d'un quiz (glisser-déposer côté admin). */
    @Transactional
    public void reorderQuestions(UUID quizId, List<UUID> orderedQuestionIds) {
        var byId = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).stream()
                .collect(Collectors.toMap(Question::getId, q -> q));
        if (byId.size() != orderedQuestionIds.size() || !byId.keySet().containsAll(orderedQuestionIds)) {
            throw new ApiException("La liste fournie ne correspond pas exactement aux questions de ce quiz.");
        }
        int idx = 0;
        for (UUID id : orderedQuestionIds) {
            Question q = byId.get(id);
            q.setOrderIndex(idx++);
            questionRepository.save(q);
        }
    }

    @Transactional(readOnly = true)
    public List<QuestionAdminResponse> listQuestions(UUID quizId) {
        if (!quizRepository.existsById(quizId)) {
            throw new NotFoundException("Quiz introuvable.");
        }
        return questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).stream()
                .map(this::toQuestionAdmin)
                .toList();
    }

    /** Clone chaque question d'un quiz source dans un quiz cible déjà créé — utilisé par
     * QuizService#duplicateQuiz pour dupliquer un quiz entier. */
    @Transactional
    public void copyQuestionsToQuiz(UUID sourceQuizId, Quiz targetQuiz) {
        int idx = 0;
        for (Question q : questionRepository.findByQuizIdOrderByOrderIndexAsc(sourceQuizId)) {
            Question clone = cloneQuestion(q, idx++);
            clone.setQuiz(targetQuiz);
            questionRepository.save(clone);
        }
    }

    /** Copie profonde d'une question (métadonnées + options), sans rattachement quiz — l'appelant fixe la cible. */
    private Question cloneQuestion(Question source, int orderIndex) {
        Question copy = Question.builder()
                .prompt(source.getPrompt())
                .questionType(source.getQuestionType())
                .orderIndex(orderIndex)
                .explanation(source.getExplanation())
                .imageAssetId(source.getImageAssetId())
                .metadata(source.getMetadata())
                .build();
        for (AnswerOption o : source.getOptions()) {
            copy.getOptions().add(AnswerOption.builder()
                    .question(copy)
                    .label(o.getLabel())
                    .correct(o.isCorrect())
                    .orderIndex(o.getOrderIndex())
                    .build());
        }
        return copy;
    }

    private List<CreateOptionRequest> optionsOrEmpty(CreateQuestionRequest request) {
        return request.options() != null ? request.options() : List.of();
    }

    private void validateQuestionOptions(CreateQuestionRequest request) {
        if (!CHOICE_TYPES.contains(request.questionType())) {
            return;
        }
        List<CreateOptionRequest> options = optionsOrEmpty(request);
        if (options.isEmpty()) {
            throw new ApiException("Ce type de question nécessite au moins une option.");
        }
        long correctOptions = options.stream().filter(CreateOptionRequest::correct).count();
        if (request.questionType() == QuestionType.SINGLE_CHOICE || request.questionType() == QuestionType.TRUE_FALSE) {
            if (correctOptions != 1) {
                throw new ApiException("Ce type de question nécessite exactement une bonne réponse.");
            }
        } else if (correctOptions < 1) {
            throw new ApiException("Au moins une bonne réponse est requise.");
        }
    }

    private QuestionAdminResponse toQuestionAdmin(Question q) {
        return new QuestionAdminResponse(
                q.getId(),
                q.getQuiz() != null ? q.getQuiz().getId() : null,
                q.getPrompt(),
                q.getQuestionType(),
                q.getOrderIndex(),
                q.getExplanation(),
                q.getImageAssetId(),
                q.getOptions().stream()
                        .map(o -> new QuestionAdminResponse.OptionAdminResponse(
                                o.getId(), o.getLabel(), o.isCorrect(), o.getOrderIndex()))
                        .toList(),
                q.getMetadata()
        );
    }

    private QuizAdminResponse toAdmin(Quiz quiz) {
        int count = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).size();
        return new QuizAdminResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getQuizType(),
                quiz.getLesson() != null ? quiz.getLesson().getId() : null,
                quiz.getModule() != null ? quiz.getModule().getId() : null,
                quiz.getUfCode(),
                quiz.getYearNumber(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getTimeLimitSeconds(),
                quiz.isRandomizeQuestions(),
                quiz.isRandomizeOptions(),
                quiz.getRetryDelayHours(),
                quiz.isBlocking(),
                quiz.isPublished(),
                quiz.isProctoringEnabled(),
                quiz.isFocusLossDetection(),
                quiz.isCopyProtection(),
                quiz.isLockdownMode(),
                count
        );
    }
}
