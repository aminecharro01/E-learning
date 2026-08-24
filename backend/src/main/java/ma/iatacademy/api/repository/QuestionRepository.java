package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Question;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByQuizIdOrderByOrderIndexAsc(UUID quizId);

    /** Global search — staff-only (see SearchService), so quiz answers never leak to learners. */
    @Query("SELECT q FROM Question q WHERE LOWER(q.prompt) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Question> searchByPromptContainingIgnoreCase(@Param("q") String q, Pageable pageable);
}
