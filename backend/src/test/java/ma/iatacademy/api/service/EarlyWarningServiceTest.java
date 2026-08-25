package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.TimeTrackingLog;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.analytics.InactiveStudentResponse;
import ma.iatacademy.api.dto.analytics.ModuleTimeResponse;
import ma.iatacademy.api.repository.LessonProgressRepository;
import ma.iatacademy.api.repository.TimeTrackingLogRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EarlyWarningServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private LessonProgressRepository lessonProgressRepository;
    @Mock
    private TimeTrackingLogRepository timeTrackingLogRepository;

    @InjectMocks
    private EarlyWarningService earlyWarningService;

    @Test
    void studentWithRecentActivityIsNotFlaggedInactive() {
        User student = User.builder().id(UUID.randomUUID()).build();
        when(userRepository.findByRole(Role.ETUDIANT)).thenReturn(List.of(student));
        var progress = ma.iatacademy.api.domain.entity.LessonProgress.builder().build();
        progress.setUpdatedAt(Instant.now());
        when(lessonProgressRepository.findTopByUserIdOrderByUpdatedAtDesc(student.getId()))
                .thenReturn(Optional.of(progress));

        List<InactiveStudentResponse> result = earlyWarningService.findInactiveStudents(14);

        assertTrue(result.isEmpty());
    }

    @Test
    void studentWithNoActivitySinceThresholdIsFlagged() {
        User student = User.builder().id(UUID.randomUUID()).fullName("Inactive Student").build();
        student.setCreatedAt(Instant.now().minus(60, ChronoUnit.DAYS));
        when(userRepository.findByRole(Role.ETUDIANT)).thenReturn(List.of(student));
        when(lessonProgressRepository.findTopByUserIdOrderByUpdatedAtDesc(student.getId()))
                .thenReturn(Optional.empty());

        List<InactiveStudentResponse> result = earlyWarningService.findInactiveStudents(14);

        assertEquals(1, result.size());
        assertEquals("Inactive Student", result.get(0).fullName());
    }

    @Test
    void moduleTimeBreakdownAggregatesSecondsPerLesson() {
        UUID moduleId = UUID.randomUUID();
        Lesson lessonA = Lesson.builder().id(UUID.randomUUID()).title("Lesson A")
                .module(ModuleEntity.builder().id(moduleId).build()).build();
        TimeTrackingLog log1 = TimeTrackingLog.builder().lesson(lessonA).secondsSpent(120).build();
        TimeTrackingLog log2 = TimeTrackingLog.builder().lesson(lessonA).secondsSpent(60).build();
        when(timeTrackingLogRepository.findByModuleIdAndEventDateBetween(any(), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(log1, log2));

        List<ModuleTimeResponse> result = earlyWarningService.moduleTimeBreakdown(moduleId);

        assertEquals(1, result.size());
        assertEquals(180L, result.get(0).totalSeconds());
    }
}
