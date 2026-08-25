package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.EssayGrade;
import ma.iatacademy.api.domain.entity.ProctoringEvent;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.proctoring.ProctoringEventRequest;
import ma.iatacademy.api.dto.proctoring.ProctoringEventResponse;
import ma.iatacademy.api.dto.quiz.AttemptReviewResponse;
import ma.iatacademy.api.dto.quiz.QuizAttemptAdminResponse;
import ma.iatacademy.api.dto.quiz.QuizAttemptResponse;
import ma.iatacademy.api.dto.quiz.QuizOptionPublic;
import ma.iatacademy.api.dto.quiz.QuizQuestionPublic;
import ma.iatacademy.api.dto.quiz.QuizStartResponse;
import ma.iatacademy.api.dto.quiz.QuizSubmitRequest;
import ma.iatacademy.api.dto.quiz.QuizSubmitResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.GoneException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.EssayGradeRepository;
import ma.iatacademy.api.repository.ProctoringEventRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Cycle de vie d'une tentative de quiz (démarrage, soumission, expiration, surveillance
 * anti-triche, effets de bord une fois le score connu) — extrait de QuizService. QuizService
 * reste le point d'entrée pour QuizController et délègue chaque appel ici.
 */
@Service
@RequiredArgsConstructor
public class QuizAttemptService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final ProgressionService progressionService;
    private final NotificationService notificationService;
    private final BadgeService badgeService;
    private final CertificateService certificateService;
    private final ProctoringEventRepository proctoringEventRepository;
    private final EssayGradeRepository essayGradeRepository;

    @Transactional
    public QuizStartResponse start(UUID quizId, UserPrincipal principal) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        if (!quiz.isPublished() && principal.getRole() == Role.ETUDIANT) {
            throw new ForbiddenException("Ce quiz n'est pas encore publié.");
        }

        assertCanAccessQuiz(principal, quiz);

        boolean preview = principal.getRole().isStaff();
        QuizAttempt resumable = preview ? null : resolveResumableAttempt(principal.getId(), quiz);

        List<Question> bank = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId);
        if (bank.isEmpty()) {
            throw new ApiException("Ce quiz ne contient aucune question.");
        }

        List<Question> drawn;
        if (resumable != null) {
            Map<UUID, Question> byId = bank.stream().collect(Collectors.toMap(Question::getId, q -> q));
            drawn = resumable.getQuestionOrder().stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .toList();
        } else {
            drawn = new ArrayList<>(bank);
            if (quiz.isRandomizeQuestions()) {
                Collections.shuffle(drawn);
            }
        }

        Instant now = resumable != null ? resumable.getStartedAt() : Instant.now();
        Instant expiresAt = resumable != null
                ? resumable.getExpiresAt()
                : (quiz.getTimeLimitSeconds() > 0 ? now.plusSeconds(quiz.getTimeLimitSeconds()) : null);

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
        } else if (resumable != null) {
            // Tentative déjà ouverte (session Redis toujours valide) : on la renvoie telle
            // quelle plutôt que d'en créer une seconde — évite le faux blocage "Une tentative
            // est déjà en cours" quand la page est simplement rechargée/remontée.
            attemptId = resumable.getId();
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
                    optionDtos,
                    redactMetadata(q)
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
                publicQuestions,
                new QuizStartResponse.ProctoringConfig(
                        quiz.isProctoringEnabled(),
                        quiz.isFocusLossDetection(),
                        quiz.isCopyProtection(),
                        quiz.isLockdownMode()
                )
        );
    }

    /** Journalise un évènement de surveillance côté client (focus perdu, copier-coller…). */
    @Transactional
    public void recordProctoringEvent(UUID attemptId, ProctoringEventRequest request, UserPrincipal principal) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new NotFoundException("Tentative introuvable."));
        if (!attempt.getUser().getId().equals(principal.getId())) {
            throw new ForbiddenException("Cette tentative ne vous appartient pas.");
        }
        ProctoringEvent event = ProctoringEvent.builder()
                .attempt(attempt)
                .eventType(request.eventType())
                .occurredAt(Instant.now())
                .meta(request.meta())
                .build();
        proctoringEventRepository.save(event);
    }

    /** Vue staff : toutes les tentatives d'un quiz, avec le nombre d'évènements anti-triche relevés. */
    @Transactional
    public List<QuizAttemptAdminResponse> listAttemptsForStaff(UUID quizId) {
        List<QuizAttempt> attempts = quizAttemptRepository.findByQuizIdOrderByStartedAtDesc(quizId);
        attempts.forEach(this::reconcileIfAbandoned);
        return attempts.stream()
                .map(a -> new QuizAttemptAdminResponse(
                        a.getId(), a.getUser().getId(),
                        a.getUser().getFullName() != null ? a.getUser().getFullName() : a.getUser().getEmail(),
                        a.getStatus(), a.getScore(), a.getStartedAt(), a.getSubmittedAt(),
                        proctoringEventRepository.countByAttemptId(a.getId())))
                .toList();
    }

    /** Un apprenant qui ferme l'onglet sans jamais soumettre laisse une tentative
     * IN_PROGRESS pour toujours — rien ne la revoit tant qu'il ne revient pas lui-même
     * (submit() ne détecte l'abandon qu'à ce moment-là). On applique ici la même logique
     * dès qu'un membre du staff consulte la liste : si la session Redis a expiré, la
     * tentative est bien abandonnée. */
    private void reconcileIfAbandoned(QuizAttempt attempt) {
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            return;
        }
        if (Boolean.TRUE.equals(redisTemplate.hasKey(attemptKey(attempt.getId())))) {
            return;
        }
        attempt.setStatus(AttemptStatus.EXPIRED);
        attempt.setSubmittedAt(Instant.now());
        quizAttemptRepository.save(attempt);
    }

    @Transactional(readOnly = true)
    public List<ProctoringEventResponse> listProctoringEvents(UUID attemptId) {
        return proctoringEventRepository.findByAttemptIdOrderByOccurredAtAsc(attemptId).stream()
                .map(e -> new ProctoringEventResponse(e.getId(), e.getEventType(), e.getOccurredAt(), e.getMeta()))
                .toList();
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
        if (principal.getRole().isStaff()) {
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
        boolean wasModuleCompleted = quiz.getModule() != null
                && progressionService.isModuleContentCompleted(principal.getId(), quiz.getModule().getId());
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)
                .stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        List<UUID> expectedOrder = attempt.getQuestionOrder();
        if (expectedOrder == null || expectedOrder.isEmpty()) {
            throw new ApiException("Ordre des questions invalide pour cette tentative.");
        }

        ScoreResult scoreResult = scoreAnswers(expectedOrder, questionMap, request, quiz.getPassingScore());
        Instant now = Instant.now();
        attempt.setAnswers(request.answers());
        attempt.setFreeTextAnswers(request.freeTextAnswers());
        attempt.setStructuredAnswers(request.structuredAnswers());
        attempt.setScore(scoreResult.score());
        attempt.setSubmittedAt(now);
        attempt.setStatus(scoreResult.pendingReview()
                ? AttemptStatus.PENDING_REVIEW
                : (scoreResult.passed() ? AttemptStatus.PASSED : AttemptStatus.FAILED));
        quizAttemptRepository.save(attempt);

        redisTemplate.delete(List.of(attemptKey(attempt.getId()), questionsKey(attempt.getId())));

        if (scoreResult.pendingReview()) {
            notificationService.notify(attempt.getUser(), NotificationType.QUIZ_GRADED,
                    "Quiz soumis — correction en attente",
                    "\"" + quiz.getTitle() + "\" contient des questions ouvertes : un formateur doit encore les corriger.",
                    "/app");
        } else {
            applyPassEffects(attempt, quiz, principal.getId(), wasModuleCompleted, scoreResult.passed(), scoreResult.score());
        }

        return new QuizSubmitResponse(
                attempt.getId(),
                scoreResult.score(),
                quiz.getPassingScore(),
                attempt.getStatus(),
                scoreResult.passed() && !scoreResult.pendingReview(),
                now,
                false
        );
    }

    /** Effets de bord une fois le score définitif connu (notification, badge, certificat).
     * Partagé entre soumission directe et finalisation post-correction manuelle
     * (voir QuizGradingService#finalizeIfFullyGraded). */
    @Transactional
    public void applyPassEffects(QuizAttempt attempt, Quiz quiz, UUID userId, boolean wasModuleCompleted, boolean passed, BigDecimal score) {
        notificationService.notify(attempt.getUser(), NotificationType.QUIZ_GRADED,
                passed ? "Quiz réussi" : "Quiz terminé",
                "\"" + quiz.getTitle() + "\" — score : " + score + "%.",
                "/app");
        if (score.compareTo(BigDecimal.valueOf(100)) == 0) {
            badgeService.awardIfAbsent(attempt.getUser(), BadgeCode.PERFECT_QUIZ);
        }

        if (passed && quiz.getQuizType() == QuizType.FIN_MODULE && quiz.getModule() != null) {
            certificateService.tryIssueIfEligible(userId, quiz.getModule().getFormation().getId());
            if (!wasModuleCompleted
                    && progressionService.isModuleContentCompleted(userId, quiz.getModule().getId())) {
                notificationService.notify(attempt.getUser(), NotificationType.MODULE_COMPLETED,
                        "Module terminé",
                        "Vous avez terminé le module \"" + quiz.getModule().getTitle() + "\".",
                        "/app");
                badgeService.awardIfAbsent(attempt.getUser(), BadgeCode.FIRST_MODULE);
            }
        }
    }

    private QuizSubmitResponse submitPreview(UUID quizId, QuizSubmitRequest request, UserPrincipal principal) {
        if (!principal.getRole().isStaff()) {
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

        ScoreResult scoreResult = scoreAnswers(expectedOrder, questionMap, request, quiz.getPassingScore());
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
            QuizSubmitRequest request,
            int passingScore
    ) {
        int correctCount = 0;
        int gradableCount = 0;
        boolean pendingReview = false;
        for (UUID questionId : expectedOrder) {
            Question question = questionMap.get(questionId);
            if (question == null) {
                continue;
            }
            if (question.getQuestionType() == QuestionType.ESSAY) {
                pendingReview = true;
                continue;
            }
            gradableCount++;
            if (isQuestionCorrect(question, request.answers(), request.freeTextAnswers(), request.structuredAnswers())) {
                correctCount++;
            }
        }
        BigDecimal score = gradableCount == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(correctCount * 100.0 / gradableCount)
                .setScale(2, RoundingMode.HALF_UP);
        boolean passed = !pendingReview && score.compareTo(BigDecimal.valueOf(passingScore)) >= 0;
        return new ScoreResult(score, passed, pendingReview);
    }

    private record ScoreResult(BigDecimal score, boolean passed, boolean pendingReview) {
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

    /**
     * Ne renvoie jamais la réponse attendue au client pendant la tentative — seul ce qui
     * sert à afficher la question (image, longueur max pour ESSAY…) est conservé.
     */
    private Map<String, Object> redactMetadata(Question question) {
        if (question.getMetadata() == null) {
            return null;
        }
        Map<String, Object> metadata = question.getMetadata();
        return switch (question.getQuestionType()) {
            case ESSAY -> {
                Object maxLength = metadata.get("maxLength");
                yield maxLength != null ? Map.of("maxLength", maxLength) : Map.of();
            }
            default -> metadata;
        };
    }

    @Transactional
    public List<QuizAttemptResponse> listAttempts(UUID quizId, UserPrincipal principal) {
        if (!quizRepository.existsById(quizId)) {
            throw new NotFoundException("Quiz introuvable.");
        }
        List<QuizAttempt> attempts = quizAttemptRepository
                .findByUserIdAndQuizIdOrderByStartedAtDesc(principal.getId(), quizId);
        attempts.forEach(this::reconcileIfAbandoned);
        return attempts.stream()
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

    /** Détail question par question d'une tentative terminée — bonne/mauvaise réponse pour
     * que l'apprenant revoie ce qu'il a répondu. Jamais accessible tant que la tentative est
     * en cours (ça reviendrait à donner les réponses pendant l'épreuve). */
    @Transactional(readOnly = true)
    public AttemptReviewResponse getAttemptReview(UUID attemptId, UserPrincipal principal) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new NotFoundException("Tentative introuvable."));
        if (!attempt.getUser().getId().equals(principal.getId()) && !principal.getRole().isStaff()) {
            throw new ForbiddenException("Cette tentative ne vous appartient pas.");
        }
        if (attempt.getStatus() == AttemptStatus.IN_PROGRESS) {
            throw new ApiException("La tentative n'est pas encore terminée.");
        }

        Quiz quiz = attempt.getQuiz();
        Map<UUID, Question> questionMap = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId())
                .stream().collect(Collectors.toMap(Question::getId, q -> q));
        Map<UUID, EssayGrade> gradesByQuestion = essayGradeRepository.findByAttemptId(attempt.getId()).stream()
                .collect(Collectors.toMap(g -> g.getQuestion().getId(), g -> g));

        List<UUID> order = attempt.getQuestionOrder() != null ? attempt.getQuestionOrder() : List.of();
        List<AttemptReviewResponse.QuestionReview> reviews = order.stream()
                .map(questionMap::get)
                .filter(Objects::nonNull)
                .map(q -> toQuestionReview(q, attempt, gradesByQuestion.get(q.getId())))
                .toList();

        return new AttemptReviewResponse(attempt.getId(), attempt.getScore(), quiz.getPassingScore(),
                attempt.getStatus(), reviews);
    }

    private AttemptReviewResponse.QuestionReview toQuestionReview(Question q, QuizAttempt attempt, EssayGrade grade) {
        if (q.getQuestionType() == QuestionType.ESSAY) {
            String submitted = attempt.getFreeTextAnswers() == null
                    ? null : attempt.getFreeTextAnswers().get(q.getId().toString());
            return new AttemptReviewResponse.QuestionReview(
                    q.getId(), q.getPrompt(), q.getQuestionType(), List.of(), submitted,
                    null,
                    grade != null ? grade.getScore() : null,
                    grade != null ? grade.getFeedback() : null,
                    q.getExplanation()
            );
        }

        List<String> selectedRaw = attempt.getAnswers() == null
                ? List.of() : attempt.getAnswers().getOrDefault(q.getId().toString(), List.of());
        Set<UUID> selected = selectedRaw.stream()
                .filter(Objects::nonNull)
                .map(UUID::fromString)
                .collect(Collectors.toSet());
        List<AttemptReviewResponse.OptionReview> options = q.getOptions().stream()
                .sorted(Comparator.comparingInt(AnswerOption::getOrderIndex))
                .map(o -> new AttemptReviewResponse.OptionReview(o.getId(), o.getLabel(), o.isCorrect(), selected.contains(o.getId())))
                .toList();
        boolean correct = isAnswerCorrect(q, selectedRaw);
        return new AttemptReviewResponse.QuestionReview(
                q.getId(), q.getPrompt(), q.getQuestionType(), options, null, correct, null, null, q.getExplanation()
        );
    }

    private void assertCanAccessQuiz(UserPrincipal principal, Quiz quiz) {
        if (principal.getRole().isStaff()) {
            return;
        }
        if (quiz.getModule() != null) {
            progressionService.assertModuleAccessible(principal, quiz.getModule());
        } else if (quiz.getLesson() != null) {
            progressionService.assertModuleAccessible(principal, quiz.getLesson().getModule());
        }
    }

    /** Retourne la tentative IN_PROGRESS à reprendre si elle existe encore réellement (session
     * Redis valide), sinon applique les règles de nouvelle tentative (max, délai) et retourne
     * null pour signaler qu'une nouvelle tentative peut être créée. Une tentative dont la
     * session Redis a expiré est d'abord réconciliée en EXPIRED (voir reconcileIfAbandoned)
     * avant d'être écartée du calcul — elle ne doit ni bloquer ni être "reprise". */
    private QuizAttempt resolveResumableAttempt(UUID userId, Quiz quiz) {
        List<QuizAttempt> previous = quizAttemptRepository
                .findByUserIdAndQuizIdOrderByStartedAtDesc(userId, quiz.getId());
        previous.forEach(this::reconcileIfAbandoned);

        Optional<QuizAttempt> open = previous.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
                .findFirst();
        if (open.isPresent()) {
            return open.get();
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
        if (lastFailed.isPresent() && quiz.getRetryDelayMinutes() > 0) {
            Instant earliest = lastFailed.get().getSubmittedAt() != null
                    ? lastFailed.get().getSubmittedAt().plus(Duration.ofMinutes(quiz.getRetryDelayMinutes()))
                    : lastFailed.get().getStartedAt().plus(Duration.ofMinutes(quiz.getRetryDelayMinutes()));
            if (Instant.now().isBefore(earliest)) {
                throw new ApiException("Délai d'attente avant une nouvelle tentative non écoulé.");
            }
        }

        return null;
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
