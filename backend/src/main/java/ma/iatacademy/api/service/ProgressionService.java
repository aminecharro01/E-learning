package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.progress.LessonProgressResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.GroupContentAssignmentRepository;
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
                .map(quiz -> quizAttemptRepository
                        .findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
                                userId, quiz.getId(), AttemptStatus.PASSED)
                        .isPresent())
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
        List<ModuleEntity> year1 = moduleRepository.findByFormationIdOrderByOrderIndexAsc(formationId)
                .stream()
                .filter(m -> yearOf(m) == 1)
                .toList();
        for (String uf : distinctUfOrder(year1)) {
            if (!isUfFullyDone(userId, uf, year1)) {
                return false;
            }
        }
        return !year1.isEmpty();
    }

    private boolean isUfFullyDone(UUID userId, String ufCode, List<ModuleEntity> yearModules) {
        boolean contentDone = yearModules.stream()
                .filter(m -> ufCode.equals(ufKey(m)))
                .allMatch(m -> isModuleContentCompleted(userId, m.getId()));
        if (!contentDone) {
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
        UUID formationId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        if (!isYear1FullyDone(userId, formationId)) {
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
