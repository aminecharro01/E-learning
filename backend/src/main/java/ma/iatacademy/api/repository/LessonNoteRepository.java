package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LessonNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonNoteRepository extends JpaRepository<LessonNote, UUID> {
    List<LessonNote> findByUserIdAndLessonIdOrderByCreatedAtDesc(UUID userId, UUID lessonId);
}
