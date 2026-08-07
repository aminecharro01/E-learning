package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.TimeTrackingLog;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.analytics.InactiveStudentResponse;
import ma.iatacademy.api.dto.analytics.ModuleTimeResponse;
import ma.iatacademy.api.repository.LessonProgressRepository;
import ma.iatacademy.api.repository.TimeTrackingLogRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EarlyWarningService {

    private final UserRepository userRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final TimeTrackingLogRepository timeTrackingLogRepository;

    /** Apprenants sans aucune activité de progression depuis au moins `days` jours. */
    @Transactional(readOnly = true)
    public List<InactiveStudentResponse> findInactiveStudents(int days) {
        Instant threshold = Instant.now().minus(Duration.ofDays(days));
        List<InactiveStudentResponse> result = new ArrayList<>();
        for (User student : userRepository.findByRole(Role.ETUDIANT)) {
            var last = lessonProgressRepository.findTopByUserIdOrderByUpdatedAtDesc(student.getId());
            Instant lastActivity = last.map(p -> p.getUpdatedAt()).orElse(student.getCreatedAt());
            if (lastActivity == null || lastActivity.isBefore(threshold)) {
                long daysInactive = ChronoUnit.DAYS.between(lastActivity != null ? lastActivity : Instant.EPOCH, Instant.now());
                result.add(new InactiveStudentResponse(
                        student.getId(),
                        student.getFullName() != null ? student.getFullName() : student.getEmail(),
                        lastActivity, daysInactive));
            }
        }
        result.sort(Comparator.comparingLong(InactiveStudentResponse::daysInactive).reversed());
        return result;
    }

    /** Temps total passé par leçon dans un module, sur les 30 derniers jours. */
    @Transactional(readOnly = true)
    public List<ModuleTimeResponse> moduleTimeBreakdown(UUID moduleId) {
        LocalDate from = LocalDate.now().minusDays(30);
        LocalDate to = LocalDate.now();
        Map<UUID, long[]> totals = new LinkedHashMap<>(); // lessonId -> [seconds]
        Map<UUID, String> titles = new LinkedHashMap<>();
        for (TimeTrackingLog log : timeTrackingLogRepository.findByModuleIdAndEventDateBetween(moduleId, from, to)) {
            Lesson lesson = log.getLesson();
            if (lesson == null) continue;
            totals.computeIfAbsent(lesson.getId(), k -> new long[]{0})[0] += log.getSecondsSpent();
            titles.putIfAbsent(lesson.getId(), lesson.getTitle());
        }
        List<ModuleTimeResponse> result = new ArrayList<>();
        totals.forEach((lessonId, seconds) -> result.add(new ModuleTimeResponse(lessonId, titles.get(lessonId), seconds[0])));
        result.sort(Comparator.comparingLong(ModuleTimeResponse::totalSeconds).reversed());
        return result;
    }
}
