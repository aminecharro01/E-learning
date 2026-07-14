package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.progress.LessonProgressResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
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
import java.util.List;
import java.util.UUID;

/**
 * Progression rules (server-side).
 * TODO: à valider avec le client — defaults from Annexe A.
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

    @Transactional
    public LessonProgressResponse updateLessonProgress(UUID userId, UUID lessonId, int videoWatchedPercent) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));

        LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .orElseGet(() -> LessonProgress.builder()
                        .user(userRepository.getReferenceById(userId))
                        .lesson(lesson)
                        .build());

        progress.setVideoWatchedPercent(Math.max(progress.getVideoWatchedPercent(), videoWatchedPercent));
        // TODO: à valider avec le client — default completion threshold 90%
        if (!progress.isCompleted()
                && progress.getVideoWatchedPercent() >= quizProperties.getSectionCompletionVideoPercent()) {
            progress.setCompleted(true);
            progress.setCompletedAt(Instant.now());
        }
        lessonProgressRepository.save(progress);
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
        if (principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR) {
            return;
        }
        if (!isModuleAccessible(principal.getId(), module)) {
            throw new ForbiddenException(
                    "Ce module est verrouillé. Validez le module précédent pour y accéder.");
        }
    }

    @Transactional(readOnly = true)
    public boolean isModuleAccessible(UUID userId, ModuleEntity module) {
        if (module.getOrderIndex() <= 0) {
            return true;
        }
        return moduleRepository.findByFormationIdOrderByOrderIndexAsc(module.getFormation().getId())
                .stream()
                .filter(m -> m.getOrderIndex() == module.getOrderIndex() - 1)
                .findFirst()
                .map(prev -> isModuleCompleted(userId, prev.getId()))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isModuleCompleted(UUID userId, UUID moduleId) {
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

    @Transactional(readOnly = true)
    public boolean isLessonCompleted(UUID userId, UUID lessonId) {
        return lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)
                .map(LessonProgress::isCompleted)
                .orElse(false);
    }
}
