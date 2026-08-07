package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LessonComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LessonCommentRepository extends JpaRepository<LessonComment, UUID> {
    List<LessonComment> findByLessonIdOrderByCreatedAtAsc(UUID lessonId);

    List<LessonComment> findByModuleIdOrderByCreatedAtAsc(UUID moduleId);

    /** File de modération : les entrées les plus récentes en premier, staff uniquement. */
    Page<LessonComment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<LessonComment> findByHiddenTrueOrderByCreatedAtDesc(Pageable pageable);
}
