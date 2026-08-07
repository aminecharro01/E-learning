package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {
    Optional<LessonProgress> findByUserIdAndLessonId(UUID userId, UUID lessonId);
    List<LessonProgress> findByUserId(UUID userId);
    Optional<LessonProgress> findTopByUserIdOrderByUpdatedAtDesc(UUID userId);
}
