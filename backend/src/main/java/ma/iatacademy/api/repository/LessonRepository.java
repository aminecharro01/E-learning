package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Lesson;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {
    List<Lesson> findByModuleIdOrderByOrderIndexAsc(UUID moduleId);
    long countByPublishedTrue();

    @Query("""
            SELECT l FROM Lesson l
            WHERE l.published = true AND LOWER(l.title) LIKE LOWER(CONCAT('%', :q, '%'))
            """)
    List<Lesson> searchPublishedByTitle(@Param("q") String q, Pageable pageable);
}
