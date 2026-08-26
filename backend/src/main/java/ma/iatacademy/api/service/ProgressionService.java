package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.progress.LessonProgressResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.GroupContentAssignmentRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonProgressRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Progression linéaire par UF.
 * UF 5 / UF 11 : validation directeur requise pour débloquer la suite.
 * Année 2 : ouverture auto à la date de rentrée (paramètres) si année 1 terminée.
 */
@Service
@RequiredArgsConstructor
public class ProgressionService {

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final QuizProperties quizProperties;
    private final AppSettingsService appSettingsService;
    private final UfValidationService ufValidationService;
    private final NotificationService notificationService;
    private final BadgeService badgeService;
    private final GroupContentAssignmentRepository assignmentRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final AssetDownloadRepository assetDownloadRepository;

    @Transactional
    public LessonProgressResponse updateLessonProgress(UUID userId, UUID lessonId, int videoWatchedPercent) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));

        boolean wasModuleCompleted = isModuleContentCompleted(userId, lesson.getModule().getId());

        LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElseGet(() -> LessonProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .lesson(lesson)
                        .build());

        progress.setVideoWatchedPercent(Math.max(progress.getVideoWatchedPercent(), videoWatchedPercent));
        if (!progress.isCompleted()
                && progress.getVideoWatchedPercent() >= quizProperties.getSectionCompletionVideoPercent()) {
            assertRequiredDownloadsComplete(userId, lesson);
            progress.setCompleted(true);
            progress.setCompletedAt(Instant.now());
        }
        lessonProgressRepository.save(progress);

        if (!wasModuleCompleted && isModuleContentCompleted(userId, lesson.getModule().getId())) {
            User learner = userRepository.getReferenceById(userId);
            notificationService.notify(learner, NotificationType.MODULE_COMPLETED,
                    "Module terminé",
                    "Vous avez terminé le module \"" + lesson.getModule().getTitle() + "\".",
                    "/app");
            badgeService.awardIfAbsent(learner, BadgeCode.FIRST_MODULE);
        }

        return new LessonProgressResponse(
                lessonId,
                progress.getVideoWatchedPercent(),
                progress.isCompleted(),
                progress.getCompletedAt()
        );
    }

    /**
     * A lesson can't complete until every PDF block flagged required:true (default
     * when the key is absent) has a matching asset_downloads row for this user - see
     * MediaService#recordDownloadAndSign, the only place that writes one. Keyed on
     * (user, asset), not lesson: the same asset reused across two lessons only needs
     * downloading once.
     */
    private void assertRequiredDownloadsComplete(UUID userId, Lesson lesson) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole().isStaff()) {
            return;
        }
        List<String> missing = lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId()).stream()
                .filter(block -> block.getBlockType() == BlockType.PDF)
                .filter(block -> !Boolean.FALSE.equals(block.getContent().get("required")))
                .filter(block -> {
                    Object assetId = block.getContent().get("assetId");
                    return assetId != null
                            && !assetDownloadRepository.existsByUserIdAndAssetId(userId, UUID.fromString(String.valueOf(assetId)));
                })
                .map(block -> String.valueOf(block.getContent().getOrDefault("title", "Document PDF")))
                .toList();
        if (!missing.isEmpty()) {
            throw new ApiException("Téléchargez d'abord : " + String.join(", ", missing) + ".");
        }
    }

    @Transactional(readOnly = true)
    public ModuleLearnerStatus resolveModuleStatus(UUID userId, ModuleEntity module) {
        if (isModuleCompleted(userId, module.getId())) {
            return ModuleLearnerStatus.COMPLETED;
        }
        if (!isModuleAccessible(userId, module)) {
            return ModuleLearnerStatus.LOCKED;
        }
        List<Lesson> lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());
        boolean started = lessons.stream().anyMatch(lesson ->
                lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId())
                        .map(p -> p.isCompleted() || p.getVideoWatchedPercent() > 0)
                        .orElse(false));
        return started ? ModuleLearnerStatus.IN_PROGRESS : ModuleLearnerStatus.AVAILABLE;
    }

    @Transactional(readOnly = true)
    public void assertModuleAccessible(UserPrincipal principal, ModuleEntity module) {
        if (principal.getRole().isStaff()) {
            return;
        }
        if (!isModuleAccessible(principal.getId(), module)) {
            throw new ForbiddenException(
                    "Ce module est verrouillé. Terminez l'unité précédente "
                            + "(et attendez la validation directeur pour Stage / Soutenance), "
                            + "ou l'ouverture de l'année 2.");
        }
    }

    @Transactional
    public boolean isModuleAccessible(UUID userId, ModuleEntity module) {
        // Apprenant hybride (rattaché à un groupe) : aucun déblocage automatique.
        // L'accès dépend uniquement des affectations décidées par le directeur —
        // la progression séquentielle par UF ci-dessous ne s'applique pas à lui.
        User learner = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (learner.getGroup() != null) {
            return assignmentRepository.isUnlocked(
                    learner.getGroup().getId(), module.getId(), Instant.now());
        }

        int year = yearOf(module);
        if (year >= 2) {
            ensureYear2AccessIfEligible(userId);
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
            if (!user.isYear2AccessEnabled()) {
                return false;
            }
        }

        List<ModuleEntity> all = moduleRepository
                .findByFormationIdOrderByOrderIndexAsc(module.getFormation().getId());
        List<ModuleEntity> yearModules = all.stream()
                .filter(m -> yearOf(m) == year)
                .toList();

        List<String> ufOrder = distinctUfOrder(yearModules);
        String currentUf = ufKey(module);
        int idx = ufOrder.indexOf(currentUf);
        if (idx <= 0) {
            return true;
        }

        String previousUf = ufOrder.get(idx - 1);
        return isUfFullyDone(userId, previousUf, yearModules);
    }

    /** Contenu pédagogique terminé (leçons + quiz fin de module). */
    @Transactional(readOnly = true)
    public boolean isModuleCompleted(UUID userId, UUID moduleId) {
        return isModuleContentCompleted(userId, moduleId);
    }

    @Transactional(readOnly = true)
    public boolean isModuleContentCompleted(UUID userId, UUID moduleId) {
        List<Lesson> lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId);
        if (lessons.isEmpty()) {
            return false;
        }
        boolean allLessonsDone = lessons.stream().allMatch(lesson ->
                lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId())
                        .map(LessonProgress::isCompleted)
                        .orElse(false));
        if (!allLessonsDone) {
            return false;
        }
        return quizRepository.findByModuleIdAndQuizType(moduleId, QuizType.FIN_MODULE)
                .map(quiz -> hasPassedAttempt(userId, quiz.getId()))
                .orElse(true);
    }

    private boolean hasPassedAttempt(UUID userId, UUID quizId) {
        return quizAttemptRepository
                .findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(userId, quizId, AttemptStatus.PASSED)
                .isPresent();
    }

    /** No FIN_UF quiz configured for this UF = no gate, same "optional" semantics as FIN_MODULE. */
    private boolean isUfQuizPassed(UUID userId, String ufCode) {
        return quizRepository.findByFormationIdAndUfCodeAndQuizType(DEFAULT_FORMATION_ID, ufCode, QuizType.FIN_UF)
                .map(quiz -> hasPassedAttempt(userId, quiz.getId()))
                .orElse(true);
    }

    /** No FIN_ANNEE quiz configured for this year = no gate. */
    private boolean isYearQuizPassed(UUID userId, int yearNumber) {
        return quizRepository.findByFormationIdAndYearNumberAndQuizType(DEFAULT_FORMATION_ID, yearNumber, QuizType.FIN_ANNEE)
                .map(quiz -> hasPassedAttempt(userId, quiz.getId()))
                .orElse(true);
    }

    @Transactional
    public LessonProgressResponse markLessonCompleted(UUID userId, UUID lessonId) {
        return updateLessonProgress(userId, lessonId, 100);
    }

    @Transactional(readOnly = true)
    public boolean isLessonCompleted(UUID userId, UUID lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .map(LessonProgress::isCompleted)
                .orElse(false);
    }

    @Transactional
    public boolean isYear1FullyDone(UUID userId, UUID formationId) {
        return isYear1ContentDone(userId, formationId) && isYearQuizPassed(userId, 1);
    }

    /**
     * Year 1 done except for the FIN_ANNEE quiz itself — lets the "exam unlocked?" check
     * on the learner dashboard avoid the circularity of isYear1FullyDone requiring the
     * very quiz it's meant to unlock.
     */
    @Transactional(readOnly = true)
    public boolean isYear1ContentDone(UUID userId, UUID formationId) {
        List<ModuleEntity> year1 = moduleRepository.findByFormationIdOrderByOrderIndexAsc(formationId)
                .stream()
                .filter(m -> yearOf(m) == 1)
                .toList();
        if (year1.isEmpty()) {
            return false;
        }
        for (String uf : distinctUfOrder(year1)) {
            if (!isUfFullyDone(userId, uf, year1)) {
                return false;
            }
        }
        return true;
    }

    private boolean isUfFullyDone(UUID userId, String ufCode, List<ModuleEntity> yearModules) {
        boolean contentDone = yearModules.stream()
                .filter(m -> ufCode.equals(ufKey(m)))
                .allMatch(m -> isModuleContentCompleted(userId, m.getId()));
        if (!contentDone) {
            return false;
        }
        if (!isUfQuizPassed(userId, ufCode)) {
            return false;
        }
        return ufValidationService.isValidated(userId, ufCode);
    }

    private void ensureYear2AccessIfEligible(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.isYear2AccessEnabled()) {
            return;
        }
        if (!appSettingsService.isYear2OpeningDateReached()) {
            return;
        }
        if (!isYear1FullyDone(userId, DEFAULT_FORMATION_ID)) {
            return;
        }
        user.setYear2AccessEnabled(true);
        userRepository.save(user);
    }

    private static int yearOf(ModuleEntity module) {
        return module.getYearNumber() != null ? module.getYearNumber() : 1;
    }

    private static String ufKey(ModuleEntity module) {
        if (module.getUfCode() != null && !module.getUfCode().isBlank()) {
            return module.getUfCode();
        }
        return "UF-ORD-" + module.getOrderIndex();
    }

    private static List<String> distinctUfOrder(List<ModuleEntity> modules) {
        List<String> order = new ArrayList<>();
        for (ModuleEntity module : modules) {
            String key = ufKey(module);
            if (!order.contains(key)) {
                order.add(key);
            }
        }
        return order;
    }
}
