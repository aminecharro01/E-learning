package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.*;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.quiz.*;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.GoneException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.*;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final ProgressionService progressionService;
    private final QuizProperties quizProperties;
    private final CertificateService certificateService;

    @Transactional
    public QuizStartResponse start(UUID quizId, UserPrincipal principal) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        if (!quiz.isPublished() && principal.getRole() == Role.ETUDIANT) {
            throw new ForbiddenException("Ce quiz n'est pas encore publié.");
        }

        assertCanAccessQuiz(principal, quiz);

        boolean preview = principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR;
        if (!preview) {
            assertAttemptsAllowed(principal.getId(), quiz);
        }

        List<Question> bank = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId);
        if (bank.isEmpty()) {
            throw new ApiException("Ce quiz ne contient aucune question.");
        }

        List<Question> drawn = new ArrayList<>(bank);
        if (quiz.isRandomizeQuestions()) {
            Collections.shuffle(drawn);
        }

        Instant now = Instant.now();
        Instant expiresAt = quiz.getTimeLimitSeconds() > 0
                ? now.plusSeconds(quiz.getTimeLimitSeconds())
                : null;

        List<UUID> questionOrder = drawn.stream().map(Question::getId).toList();
        UUID attemptId;
        Duration ttl = quiz.getTimeLimitSeconds() > 0
                ? Duration.ofSeconds(quiz.getTimeLimitSeconds())
                : Duration.ofHours(24);

        if (preview) {
            attemptId = UUID.randomUUID();
            redisTemplate.opsForValue().set(previewKey(attemptId), quizId.toString(), ttl);
            redisTemplate.opsForValue().set(
                    previewQuestionsKey(attemptId),
                    questionOrder.stream().map(UUID::toString).collect(Collectors.joining(",")),
                    ttl
            );
            redisTemplate.opsForValue().set(previewUserKey(attemptId), principal.getId().toString(), ttl);
        } else {
            QuizAttempt attempt = QuizAttempt.builder()
                    .user(userRepository.getReferenceById(principal.getId()))
                    .quiz(quiz)
                    .startedAt(now)
                    .expiresAt(expiresAt)
                    .status(AttemptStatus.IN_PROGRESS)
                    .questionOrder(questionOrder)
                    .build();
            quizAttemptRepository.save(attempt);
            attemptId = attempt.getId();
            redisTemplate.opsForValue().set(attemptKey(attemptId), "1", ttl);
            redisTemplate.opsForValue().set(
                    questionsKey(attemptId),
                    questionOrder.stream().map(UUID::toString).collect(Collectors.joining(",")),
                    ttl
            );
        }

        List<QuizQuestionPublic> publicQuestions = new ArrayList<>();
        int idx = 0;
        for (Question q : drawn) {
            List<AnswerOption> options = new ArrayList<>(q.getOptions());
            if (quiz.isRandomizeOptions()) {
                Collections.shuffle(options);
            }
            List<QuizOptionPublic> optionDtos = new ArrayList<>();
            for (int i = 0; i < options.size(); i++) {
                AnswerOption opt = options.get(i);
                optionDtos.add(new QuizOptionPublic(opt.getId(), opt.getLabel(), i));
            }
            publicQuestions.add(new QuizQuestionPublic(
                    q.getId(),
                    q.getPrompt(),
                    q.getQuestionType().name(),
                    idx++,
                    q.getImageAssetId(),
                    optionDtos
            ));
        }

        return new QuizStartResponse(
                attemptId,
                quiz.getId(),
                quiz.getTitle(),
                now,
                expiresAt,
                quiz.getTimeLimitSeconds(),
                quiz.getPassingScore(),
                preview,
                publicQuestions
        );
    }

    @Transactional
    public QuizSubmitResponse submit(UUID quizId, QuizSubmitRequest request, UserPrincipal principal) {
        Boolean isPreview = redisTemplate.hasKey(previewKey(request.attemptId()));
        if (Boolean.TRUE.equals(isPreview)) {
            return submitPreview(quizId, request, principal);
        }

        QuizAttempt attempt = quizAttemptRepository.findById(request.attemptId())
                .orElseThrow(() -> new NotFoundException("Tentative introuvable."));

        if (!attempt.getQuiz().getId().equals(quizId)) {
            throw new ApiException("La tentative ne correspond pas à ce quiz.");
        }
        if (!attempt.getUser().getId().equals(principal.getId())) {
            throw new ForbiddenException("Cette tentative ne vous appartient pas.");
        }
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw new ApiException("Cette tentative est déjà terminée.");
        }
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR) {
            throw new ForbiddenException("Les comptes staff ne peuvent pas soumettre de tentative réelle.");
        }

        Boolean alive = redisTemplate.hasKey(attemptKey(attempt.getId()));
        if (Boolean.FALSE.equals(alive)) {
            attempt.setStatus(AttemptStatus.EXPIRED);
            attempt.setSubmittedAt(Instant.now());
            quizAttemptRepository.save(attempt);
            throw new GoneException("Le temps imparti est écoulé. Tentative expirée.");
        }

        Quiz quiz = attempt.getQuiz();
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)
                .stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        List<UUID> expectedOrder = attempt.getQuestionOrder();
        if (expectedOrder == null || expectedOrder.isEmpty()) {
            throw new ApiException("Ordre des questions invalide pour cette tentative.");
        }

        ScoreResult scoreResult = scoreAnswers(expectedOrder, questionMap, request.answers(), quiz.getPassingScore());
        Instant now = Instant.now();
        attempt.setAnswers(request.answers());
        attempt.setScore(scoreResult.score());
        attempt.setSubmittedAt(now);
        attempt.setStatus(scoreResult.passed() ? AttemptStatus.PASSED : AttemptStatus.FAILED);
        quizAttemptRepository.save(attempt);

        redisTemplate.delete(List.of(attemptKey(attempt.getId()), questionsKey(attempt.getId())));

        if (scoreResult.passed() && quiz.getQuizType() == QuizType.FIN_MODULE && quiz.getModule() != null) {
            certificateService.tryIssueIfEligible(principal.getId(), quiz.getModule().getFormation().getId());
        }

        return new QuizSubmitResponse(
                attempt.getId(),
                scoreResult.score(),
                quiz.getPassingScore(),
                attempt.getStatus(),
                scoreResult.passed(),
                now,
                false
        );
    }

    private QuizSubmitResponse submitPreview(UUID quizId, QuizSubmitRequest request, UserPrincipal principal) {
        if (principal.getRole() != Role.ADMIN && principal.getRole() != Role.FORMATEUR) {
            throw new ForbiddenException("Aperçu réservé au staff.");
        }
        String storedQuizId = redisTemplate.opsForValue().get(previewKey(request.attemptId()));
        String storedUserId = redisTemplate.opsForValue().get(previewUserKey(request.attemptId()));
        String orderRaw = redisTemplate.opsForValue().get(previewQuestionsKey(request.attemptId()));
        if (storedQuizId == null || orderRaw == null) {
            throw new GoneException("La session d'aperçu a expiré.");
        }
        if (!UUID.fromString(storedQuizId).equals(quizId)) {
            throw new ApiException("La session d'aperçu ne correspond pas à ce quiz.");
        }
        if (storedUserId != null && !UUID.fromString(storedUserId).equals(principal.getId())) {
            throw new ForbiddenException("Cette session d'aperçu ne vous appartient pas.");
        }

        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)
                .stream()
                .collect(Collectors.toMap(Question::getId, q -> q));
        List<UUID> expectedOrder = Arrays.stream(orderRaw.split(","))
                .filter(s -> !s.isBlank())
                .map(UUID::fromString)
                .toList();

        ScoreResult scoreResult = scoreAnswers(expectedOrder, questionMap, request.answers(), quiz.getPassingScore());
        Instant now = Instant.now();

        redisTemplate.delete(List.of(
                previewKey(request.attemptId()),
                previewQuestionsKey(request.attemptId()),
                previewUserKey(request.attemptId())
        ));

        return new QuizSubmitResponse(
                request.attemptId(),
                scoreResult.score(),
                quiz.getPassingScore(),
                scoreResult.passed() ? AttemptStatus.PASSED : AttemptStatus.FAILED,
                scoreResult.passed(),
                now,
                true
        );
    }

    private ScoreResult scoreAnswers(
            List<UUID> expectedOrder,
            Map<UUID, Question> questionMap,
            Map<String, List<String>> answers,
            int passingScore
    ) {
        int correctCount = 0;
        for (UUID questionId : expectedOrder) {
            Question question = questionMap.get(questionId);
            if (question == null) {
                continue;
            }
            List<String> selected = answers.getOrDefault(questionId.toString(), List.of());
            if (isAnswerCorrect(question, selected)) {
                correctCount++;
            }
        }
        BigDecimal score = expectedOrder.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(correctCount * 100.0 / expectedOrder.size())
                .setScale(2, RoundingMode.HALF_UP);
        boolean passed = score.compareTo(BigDecimal.valueOf(passingScore)) >= 0;
        return new ScoreResult(score, passed);
    }

    private record ScoreResult(BigDecimal score, boolean passed) {
    }

    @Transactional(readOnly = true)
    public List<QuizAttemptResponse> listAttempts(UUID quizId, UserPrincipal principal) {
        if (!quizRepository.existsById(quizId)) {
            throw new NotFoundException("Quiz introuvable.");
        }
        return quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(principal.getId(), quizId)
                .stream()
                .map(a -> new QuizAttemptResponse(
                        a.getId(),
                        quizId,
                        a.getStatus(),
                        a.getScore(),
                        a.getStartedAt(),
                        a.getSubmittedAt(),
                        a.getExpiresAt()
                ))
                .toList();
    }

    @Transactional
    public QuizAdminResponse createQuiz(CreateQuizRequest request) {
        Lesson lesson = null;
        ModuleEntity module = null;
        if (request.quizType() == QuizType.APPLICATIF) {
            if (request.lessonId() == null) {
                throw new ApiException("lessonId requis pour un quiz de section.");
            }
            lesson = lessonRepository.findById(request.lessonId())
                    .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
            module = lesson.getModule();
        } else {
            if (request.moduleId() == null) {
                throw new ApiException("moduleId requis pour une évaluation de module.");
            }
            module = moduleRepository.findById(request.moduleId())
                    .orElseThrow(() -> new NotFoundException("Module introuvable."));
        }

        boolean isModuleQuiz = request.quizType() == QuizType.FIN_MODULE;
        Quiz quiz = Quiz.builder()
                .title(request.title().trim())
                .quizType(request.quizType())
                .lesson(lesson)
                .module(module)
                .passingScore(request.passingScore() != null
                        ? request.passingScore()
                        : (isModuleQuiz
                        ? quizProperties.getDefaultModulePassingScore()
                        : quizProperties.getDefaultSectionPassingScore()))
                .maxAttempts(request.maxAttempts() != null
                        ? request.maxAttempts()
                        : (isModuleQuiz ? quizProperties.getDefaultModuleMaxAttempts() : 5))
                .timeLimitSeconds(request.timeLimitSeconds() != null
                        ? request.timeLimitSeconds()
                        : (isModuleQuiz ? quizProperties.getDefaultModuleTimeLimitSeconds() : 0))
                .randomizeQuestions(request.randomizeQuestions() == null || request.randomizeQuestions())
                .randomizeOptions(request.randomizeOptions() == null || request.randomizeOptions())
                .retryDelayHours(request.retryDelayHours() != null
                        ? request.retryDelayHours()
                        : quizProperties.getDefaultRetryDelayHours())
                .blocking(request.blocking() != null ? request.blocking() : isModuleQuiz)
                .published(Boolean.TRUE.equals(request.published()))
                .build();
        quizRepository.save(quiz);
        return toAdmin(quiz);
    }

    @Transactional
    public QuizAdminResponse addQuestion(UUID quizId, CreateQuestionRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));

        validateQuestionOptions(request);

        Question question = Question.builder()
                .quiz(quiz)
                .prompt(request.prompt().trim())
                .questionType(request.questionType())
                .orderIndex(request.orderIndex())
                .explanation(request.explanation())
                .imageAssetId(request.imageAssetId())
                .build();

        for (CreateOptionRequest opt : request.options()) {
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
        question.setOrderIndex(request.orderIndex());
        question.setExplanation(request.explanation());
        question.setImageAssetId(request.imageAssetId());
        question.getOptions().clear();
        for (CreateOptionRequest opt : request.options()) {
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

    @Transactional(readOnly = true)
    public PageResponse<QuizAdminResponse> listQuizzesPaged(UUID moduleId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Quiz> quizzes = moduleId != null
                ? quizRepository.findByModuleId(moduleId, pageable)
                : quizRepository.findAll(pageable);
        return PageResponse.from(quizzes.map(this::toAdmin));
    }

    @Transactional(readOnly = true)
    public List<QuizAdminResponse> listQuizzes(UUID moduleId) {
        List<Quiz> quizzes = moduleId != null
                ? quizRepository.findByModuleIdOrderByCreatedAtDesc(moduleId)
                : quizRepository.findAllByOrderByCreatedAtDesc();
        return quizzes.stream().map(this::toAdmin).toList();
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

    private void validateQuestionOptions(CreateQuestionRequest request) {
        long correctOptions = request.options().stream().filter(CreateOptionRequest::correct).count();
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
                q.getQuiz().getId(),
                q.getPrompt(),
                q.getQuestionType(),
                q.getOrderIndex(),
                q.getExplanation(),
                q.getImageAssetId(),
                q.getOptions().stream()
                        .map(o -> new QuestionAdminResponse.OptionAdminResponse(
                                o.getId(), o.getLabel(), o.isCorrect(), o.getOrderIndex()))
                        .toList()
        );
    }

    private void assertCanAccessQuiz(UserPrincipal principal, Quiz quiz) {
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR) {
            return;
        }
        if (quiz.getModule() != null) {
            progressionService.assertModuleAccessible(principal, quiz.getModule());
        } else if (quiz.getLesson() != null) {
            progressionService.assertModuleAccessible(principal, quiz.getLesson().getModule());
        }
    }

    private void assertAttemptsAllowed(UUID userId, Quiz quiz) {
        List<QuizAttempt> previous = quizAttemptRepository
                .findByUserIdAndQuizIdOrderByStartedAtDesc(userId, quiz.getId());

        boolean hasOpen = previous.stream().anyMatch(a -> a.getStatus() == AttemptStatus.IN_PROGRESS);
        if (hasOpen) {
            throw new ApiException("Une tentative est déjà en cours pour ce quiz.");
        }

        long used = previous.stream()
                .filter(a -> a.getStatus() == AttemptStatus.PASSED
                        || a.getStatus() == AttemptStatus.FAILED
                        || a.getStatus() == AttemptStatus.EXPIRED
                        || a.getStatus() == AttemptStatus.SUBMITTED)
                .count();
        if (used >= quiz.getMaxAttempts()) {
            throw new ApiException("Nombre maximum de tentatives atteint.");
        }

        Optional<QuizAttempt> lastFailed = previous.stream()
                .filter(a -> a.getStatus() == AttemptStatus.FAILED || a.getStatus() == AttemptStatus.EXPIRED)
                .findFirst();
        if (lastFailed.isPresent() && quiz.getRetryDelayHours() > 0) {
            Instant earliest = lastFailed.get().getSubmittedAt() != null
                    ? lastFailed.get().getSubmittedAt().plus(Duration.ofHours(quiz.getRetryDelayHours()))
                    : lastFailed.get().getStartedAt().plus(Duration.ofHours(quiz.getRetryDelayHours()));
            if (Instant.now().isBefore(earliest)) {
                throw new ApiException("Délai d'attente avant une nouvelle tentative non écoulé.");
            }
        }
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

    private QuizAdminResponse toAdmin(Quiz quiz) {
        int count = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).size();
        return new QuizAdminResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getQuizType(),
                quiz.getLesson() != null ? quiz.getLesson().getId() : null,
                quiz.getModule() != null ? quiz.getModule().getId() : null,
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getTimeLimitSeconds(),
                quiz.isRandomizeQuestions(),
                quiz.isRandomizeOptions(),
                quiz.getRetryDelayHours(),
                quiz.isBlocking(),
                quiz.isPublished(),
                count
        );
    }

    private String attemptKey(UUID attemptId) {
        return "quiz_attempt:" + attemptId;
    }

    private String questionsKey(UUID attemptId) {
        return "quiz_questions:" + attemptId;
    }

    private String previewKey(UUID attemptId) {
        return "quiz_preview:" + attemptId;
    }

    private String previewQuestionsKey(UUID attemptId) {
        return "quiz_preview_questions:" + attemptId;
    }

    private String previewUserKey(UUID attemptId) {
        return "quiz_preview_user:" + attemptId;
    }
}
