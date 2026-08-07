package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.TimeTrackingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimeTrackingLogRepository extends JpaRepository<TimeTrackingLog, UUID> {
    Optional<TimeTrackingLog> findByUserIdAndLessonIdAndEventDate(UUID userId, UUID lessonId, LocalDate eventDate);

    List<TimeTrackingLog> findByModuleIdAndEventDateBetween(UUID moduleId, LocalDate from, LocalDate to);
}
