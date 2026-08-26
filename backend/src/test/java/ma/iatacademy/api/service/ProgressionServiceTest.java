package ma.iatacademy.api.service;

import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.progress.LessonProgressResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.GroupContentAssignmentRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonProgressRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressionServiceTest {

    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonProgressRepository lessonProgressRepository;
    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuizAttemptRepository quizAttemptRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AppSettingsService appSettingsService;
    @Mock
    private UfValidationService ufValidationService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BadgeService badgeService;
    @Mock
    private GroupContentAssignmentRepository assignmentRepository;
    @Mock
    private LessonBlockRepository lessonBlockRepository;
    @Mock
    private AssetDownloadRepository assetDownloadRepository;

    private QuizProperties quizProperties;
    private ProgressionService progressionService;

    @BeforeEach
    void setUp() {
        quizProperties = new QuizProperties();
        progressionService = new ProgressionService(moduleRepository, lessonRepository, lessonProgressRepository,
                quizRepository, quizAttemptRepository, userRepository, quizProperties, appSettingsService,
                ufValidationService, notificationService, badgeService, assignmentRepository,
                lessonBlockRepository, assetDownloadRepository);
    }

    @Test
    void moduleWithNoLessonsIsNeverCompleted() {
        UUID moduleId = UUID.randomUUID();
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)).thenReturn(List.of());

        assertFalse(progressionService.isModuleContentCompleted(UUID.randomUUID(), moduleId));
    }

    @Test
    void moduleIncompleteWhenSomeLessonNotDone() {
        UUID userId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Lesson lesson1 = Lesson.builder().id(UUID.randomUUID()).build();
        Lesson lesson2 = Lesson.builder().id(UUID.randomUUID()).build();
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)).thenReturn(List.of(lesson1, lesson2));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lesson1.getId()))
                .thenReturn(Optional.of(LessonProgress.builder().completed(true).build()));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lesson2.getId())).thenReturn(Optional.empty());

        assertFalse(progressionService.isModuleContentCompleted(userId, moduleId));
    }

    @Test
    void moduleCompletedWhenAllLessonsDoneAndNoGatingQuiz() {
        UUID userId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).build();
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)).thenReturn(List.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId()))
                .thenReturn(Optional.of(LessonProgress.builder().completed(true).build()));
        when(quizRepository.findByModuleIdAndQuizType(moduleId, QuizType.FIN_MODULE)).thenReturn(Optional.empty());

        assertTrue(progressionService.isModuleContentCompleted(userId, moduleId));
    }

    @Test
    void moduleIncompleteWhenGatingQuizNotPassed() {
        UUID userId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).build();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).build();
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)).thenReturn(List.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId()))
                .thenReturn(Optional.of(LessonProgress.builder().completed(true).build()));
        when(quizRepository.findByModuleIdAndQuizType(moduleId, QuizType.FIN_MODULE)).thenReturn(Optional.of(quiz));
        when(quizAttemptRepository.findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
                userId, quiz.getId(), AttemptStatus.PASSED)).thenReturn(Optional.empty());

        assertFalse(progressionService.isModuleContentCompleted(userId, moduleId));
    }

    @Test
    void moduleCompletedWhenGatingQuizPassed() {
        UUID userId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).build();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).build();
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId)).thenReturn(List.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId()))
                .thenReturn(Optional.of(LessonProgress.builder().completed(true).build()));
        when(quizRepository.findByModuleIdAndQuizType(moduleId, QuizType.FIN_MODULE)).thenReturn(Optional.of(quiz));
        when(quizAttemptRepository.findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
                userId, quiz.getId(), AttemptStatus.PASSED)).thenReturn(Optional.of(QuizAttempt.builder().build()));

        assertTrue(progressionService.isModuleContentCompleted(userId, moduleId));
    }

    @Test
    void updateLessonProgressMarksCompletedPastThreshold() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).title("Module 1").build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        lenient().when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        lenient().when(quizRepository.findByModuleIdAndQuizType(module.getId(), QuizType.FIN_MODULE))
                .thenReturn(Optional.empty());
        lenient().when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        lenient().when(userRepository.findById(userId))
                .thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        lenient().when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of());

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 95);

        assertTrue(response.completed());
        verify(lessonProgressRepository, times(1)).save(any(LessonProgress.class));
    }

    @Test
    void updateLessonProgressBelowThresholdStaysIncomplete() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        lenient().when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 30);

        assertFalse(response.completed());
    }

    @Test
    void isModuleAccessibleUsesGroupAssignmentWhenLearnerBelongsToGroup() {
        UUID userId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        var group = ma.iatacademy.api.domain.entity.LearnerGroup.builder().id(UUID.randomUUID()).build();
        User learner = User.builder().id(userId).group(group).build();
        ModuleEntity module = ModuleEntity.builder().id(moduleId).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(learner));
        when(assignmentRepository.isUnlocked(any(), any(), any())).thenReturn(true);

        assertTrue(progressionService.isModuleAccessible(userId, module));
        verify(moduleRepository, times(0)).findByFormationIdOrderByOrderIndexAsc(any());
    }

    @Test
    void completingLessonBlockedWhenRequiredPdfNotDownloaded() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Fiche technique", "required", true))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));
        when(assetDownloadRepository.existsByUserIdAndAssetId(userId, assetId)).thenReturn(false);

        assertThrows(ApiException.class,
                () -> progressionService.updateLessonProgress(userId, lessonId, 100));
    }

    @Test
    void completingLessonSucceedsWhenRequiredPdfDownloaded() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Fiche technique", "required", true))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));
        when(assetDownloadRepository.existsByUserIdAndAssetId(userId, assetId)).thenReturn(true);

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }

    @Test
    void completingLessonIgnoresOptionalPdf() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Annexe", "required", false))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }

    @Test
    void completingLessonBypassesGateForStaff() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();

        when(lessonRepository.findById(lessonId)).thenReturn(Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.FORMATEUR).build()));

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }
}
