package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.*;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.proctoring.ProctoringEventRequest;
import ma.iatacademy.api.dto.proctoring.ProctoringEventResponse;
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
    private final NotificationService notificationService;
    private final BadgeService badgeService;
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
    @Transactional(readOnly = true)
    public List<QuizAttemptAdminResponse> listAttemptsForStaff(UUID quizId) {
        return quizAttemptRepository.findByQuizIdOrderByStartedAtDesc(quizId).stream()
                .map(a -> new QuizAttemptAdminResponse(
                        a.getId(), a.getUser().getId(),
                        a.getUser().getFullName() != null ? a.getUser().getFullName() : a.getUser().getEmail(),
                        a.getStatus(), a.getScore(), a.getStartedAt(), a.getSubmittedAt(),
                        proctoringEventRepository.countByAttemptId(a.getId())))
                .toList();
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

    /** Effets de bord une fois le score définitif connu (notification, badge, certificat). Partagé entre soumission directe et finalisation post-correction manuelle. */
    private void applyPassEffects(QuizAttempt attempt, Quiz quiz, UUID userId, boolean wasModuleCompleted, boolean passed, BigDecimal score) {
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

        applyPassEffects(attempt, quiz, attempt.getUser().getId(), wasModuleCompleted, passed, finalScore);
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
            case FILL_BLANK -> isFillBlankCorrect(question, freeTextAnswers == null ? null : freeTextAnswers.get(qid));
            case MATCHING -> isMatchingCorrect(question, structuredAnswers == null ? null : structuredAnswers.get(qid));
            case HOTSPOT -> isHotspotCorrect(question, structuredAnswers == null ? null : structuredAnswers.get(qid));
            case ESSAY -> false;
        };
    }

    private boolean isFillBlankCorrect(Question question, String submitted) {
        if (submitted == null || submitted.isBlank() || question.getMetadata() == null) {
            return false;
        }
        Object acceptedRaw = question.getMetadata().get("acceptedAnswers");
        if (!(acceptedRaw instanceof List<?> accepted)) {
            return false;
        }
        String normalizedSubmitted = normalizeAnswer(submitted);
        return accepted.stream()
                .filter(Objects::nonNull)
                .map(Object::toString)
                .map(this::normalizeAnswer)
                .anyMatch(a -> a.equals(normalizedSubmitted));
    }

    /** Insensible à la casse, aux espaces superflus et aux accents. */
    private String normalizeAnswer(String s) {
        String stripped = java.text.Normalizer.normalize(s.trim().toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return stripped.replaceAll("\\s+", " ");
    }

    private boolean isMatchingCorrect(Question question, Object submittedRaw) {
        if (!(submittedRaw instanceof Map<?, ?> submitted) || question.getMetadata() == null) {
            return false;
        }
        Object pairsRaw = question.getMetadata().get("pairs");
        if (!(pairsRaw instanceof List<?> pairs) || pairs.isEmpty()) {
            return false;
        }
        for (int i = 0; i < pairs.size(); i++) {
            if (!(pairs.get(i) instanceof Map<?, ?> pair)) {
                return false;
            }
            Object expectedRight = pair.get("right");
            Object submittedRight = submitted.get(String.valueOf(i));
            if (expectedRight == null || submittedRight == null || !expectedRight.toString().equals(submittedRight.toString())) {
                return false;
            }
        }
        return true;
    }

    /** Simplification assumée : une seule zone cible par question (zones[0]), coordonnées en pourcentage. */
    /** Correct if the click falls in ANY drawn zone — real hotspot exercises commonly
     *  accept several valid target regions, not just a single one. */
    private boolean isHotspotCorrect(Question question, Object submittedRaw) {
        if (!(submittedRaw instanceof Map<?, ?> submitted) || question.getMetadata() == null) {
            return false;
        }
        Object zonesRaw = question.getMetadata().get("zones");
        if (!(zonesRaw instanceof List<?> zones) || zones.isEmpty()) {
            return false;
        }
        Double x = toDouble(submitted.get("x"));
        Double y = toDouble(submitted.get("y"));
        if (x == null || y == null) {
            return false;
        }
        for (Object zoneRaw : zones) {
            if (!(zoneRaw instanceof Map<?, ?> zone)) continue;
            Double zx = toDouble(zone.get("x"));
            Double zy = toDouble(zone.get("y"));
            Double zw = toDouble(zone.get("width"));
            Double zh = toDouble(zone.get("height"));
            if (zx == null || zy == null || zw == null || zh == null) continue;
            if (x >= zx && x <= zx + zw && y >= zy && y <= zy + zh) {
                return true;
            }
        }
        return false;
    }

    private Double toDouble(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        if (o instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Ne renvoie jamais la réponse attendue au client pendant la tentative : les paires
     * correctes (MATCHING), les zones (HOTSPOT) et les réponses acceptées (FILL_BLANK)
     * sont retirées ; seul ce qui sert à afficher la question (image, gauche du
     * matching…) est conservé.
     */
    private Map<String, Object> redactMetadata(Question question) {
        if (question.getMetadata() == null) {
            return null;
        }
        Map<String, Object> metadata = question.getMetadata();
        return switch (question.getQuestionType()) {
            case MATCHING -> {
                Object pairsRaw = metadata.get("pairs");
                if (!(pairsRaw instanceof List<?> pairs)) yield Map.of();
                List<Object> lefts = pairs.stream()
                        .filter(p -> p instanceof Map<?, ?>)
                        .map(p -> ((Map<?, ?>) p).get("left"))
                        .collect(Collectors.toList());
                List<Object> rights = pairs.stream()
                        .filter(p -> p instanceof Map<?, ?>)
                        .map(p -> ((Map<?, ?>) p).get("right"))
                        .collect(Collectors.toList());
                Collections.shuffle(rights);
                yield Map.of("lefts", lefts, "rights", rights);
            }
            case HOTSPOT -> {
                Object imageAssetId = metadata.get("imageAssetId");
                yield imageAssetId != null ? Map.of("imageAssetId", imageAssetId) : Map.of();
            }
            case FILL_BLANK -> {
                Object template = metadata.get("template");
                yield template != null ? Map.of("template", template) : Map.of();
            }
            case ESSAY -> {
                Object maxLength = metadata.get("maxLength");
                yield maxLength != null ? Map.of("maxLength", maxLength) : Map.of();
            }
            default -> metadata;
        };
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
                .proctoringEnabled(Boolean.TRUE.equals(request.proctoringEnabled()))
                .focusLossDetection(Boolean.TRUE.equals(request.focusLossDetection()))
                .copyProtection(Boolean.TRUE.equals(request.copyProtection()))
                .lockdownMode(Boolean.TRUE.equals(request.lockdownMode()))
                .build();
        quizRepository.save(quiz);

        if (request.drawFromBankId() != null && request.drawCount() != null && request.drawCount() > 0) {
            generateFromBank(quiz, request.drawFromBankId(), request.drawCount());
        }

        return toAdmin(quiz);
    }

    /**
     * Tire N questions au hasard dans une banque et les clone dans le quiz (copie, pas
     * de référence) : la banque reste un pool stable, indépendant des modifications
     * ultérieures du quiz généré. sourceBankItemId garde la traçabilité de l'origine.
     */
    private void generateFromBank(Quiz quiz, UUID bankId, int count) {
        List<Question> pool = new ArrayList<>(questionRepository.findByQuestionBankIdOrderByOrderIndexAsc(bankId));
        if (pool.isEmpty()) {
            return;
        }
        Collections.shuffle(pool);
        int idx = 0;
        for (Question src : pool.stream().limit(count).toList()) {
            Question clone = Question.builder()
                    .quiz(quiz)
                    .prompt(src.getPrompt())
                    .questionType(src.getQuestionType())
                    .orderIndex(idx++)
                    .explanation(src.getExplanation())
                    .imageAssetId(src.getImageAssetId())
                    .metadata(src.getMetadata())
                    .sourceBankItemId(src.getId())
                    .build();
            for (AnswerOption o : src.getOptions()) {
                clone.getOptions().add(AnswerOption.builder()
                        .question(clone)
                        .label(o.getLabel())
                        .correct(o.isCorrect())
                        .orderIndex(o.getOrderIndex())
                        .build());
            }
            questionRepository.save(clone);
        }
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

    /** Duplique le quiz entier (réglages + questions) — la copie est dépubliée, à relire avant activation. */
    @Transactional
    public QuizAdminResponse duplicateQuiz(UUID quizId) {
        Quiz source = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        Quiz copy = Quiz.builder()
                .title(source.getTitle() + " (copie)")
                .quizType(source.getQuizType())
                .lesson(source.getLesson())
                .module(source.getModule())
                .passingScore(source.getPassingScore())
                .maxAttempts(source.getMaxAttempts())
                .timeLimitSeconds(source.getTimeLimitSeconds())
                .randomizeQuestions(source.isRandomizeQuestions())
                .randomizeOptions(source.isRandomizeOptions())
                .retryDelayHours(source.getRetryDelayHours())
                .blocking(source.isBlocking())
                .published(false)
                .proctoringEnabled(source.isProctoringEnabled())
                .focusLossDetection(source.isFocusLossDetection())
                .copyProtection(source.isCopyProtection())
                .lockdownMode(source.isLockdownMode())
                .build();
        quizRepository.save(copy);

        int idx = 0;
        for (Question q : questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)) {
            Question clone = cloneQuestion(q, idx++);
            clone.setQuiz(copy);
            questionRepository.save(clone);
        }
        return toAdmin(copy);
    }

    /** Copie profonde d'une question (métadonnées + options), sans rattachement quiz/banque — l'appelant fixe la cible. */
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

    /** Fixe un nouvel ordre pour les questions d'un quiz (glisser-déposer côté admin). */
    @Transactional
    public void reorderQuestions(UUID quizId, List<UUID> orderedQuestionIds) {
        Map<UUID, Question> byId = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId).stream()
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

    /** Package-private : réutilisé par QuestionBankService pour les questions de banque. */
    List<CreateOptionRequest> optionsOrEmpty(CreateQuestionRequest request) {
        return request.options() != null ? request.options() : List.of();
    }

    private static final Set<QuestionType> CHOICE_TYPES =
            Set.of(QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE, QuestionType.TRUE_FALSE);

    /** Package-private : réutilisé par QuestionBankService. */
    void validateQuestionOptions(CreateQuestionRequest request) {
        if (!CHOICE_TYPES.contains(request.questionType())) {
            validateNewTypeMetadata(request);
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

    private void validateNewTypeMetadata(CreateQuestionRequest request) {
        Map<String, Object> metadata = request.metadata();
        switch (request.questionType()) {
            case MATCHING -> {
                if (metadata == null || !(metadata.get("pairs") instanceof List<?> pairs) || pairs.size() < 2) {
                    throw new ApiException("Le matching nécessite au moins 2 paires (gauche/droite).");
                }
            }
            case HOTSPOT -> {
                if (metadata == null || metadata.get("imageAssetId") == null
                        || !(metadata.get("zones") instanceof List<?> zones) || zones.isEmpty()) {
                    throw new ApiException("Le hotspot nécessite une image et au moins une zone cible.");
                }
            }
            case FILL_BLANK -> {
                if (metadata == null || metadata.get("template") == null
                        || !(metadata.get("acceptedAnswers") instanceof List<?> accepted) || accepted.isEmpty()) {
                    throw new ApiException("Le texte à trous nécessite un modèle de phrase et au moins une réponse acceptée.");
                }
            }
            case ESSAY -> {
                // Aucune métadonnée obligatoire — maxLength est optionnel.
            }
            default -> {
            }
        }
    }

    /** Package-private : réutilisé par QuestionBankService pour mapper les questions de banque. */
    QuestionAdminResponse toQuestionAdmin(Question q) {
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
                quiz.isProctoringEnabled(),
                quiz.isFocusLossDetection(),
                quiz.isCopyProtection(),
                quiz.isLockdownMode(),
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
