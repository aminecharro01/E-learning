package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LessonBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonBlockRepository extends JpaRepository<LessonBlock, UUID> {
    List<LessonBlock> findByLessonIdOrderByOrderIndexAsc(UUID lessonId);

    /** Used to append a new block after whatever the current highest order_index is —
     * never trust the client's guess, see LessonService#createBlock. */
    Optional<LessonBlock> findTopByLessonIdOrderByOrderIndexDesc(UUID lessonId);
}
