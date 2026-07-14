package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByModuleIdOrderByOrderIndexAsc(UUID moduleId);
}
