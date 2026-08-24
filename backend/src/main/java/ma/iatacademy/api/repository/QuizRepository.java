package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Quiz;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizRepository extends JpaRepository<Quiz, UUID> {
    Optional<Quiz> findByLessonIdAndQuizType(UUID lessonId, ma.iatacademy.api.domain.enums.QuizType quizType);
    Optional<Quiz> findByModuleIdAndQuizType(UUID moduleId, ma.iatacademy.api.domain.enums.QuizType quizType);
    Optional<Quiz> findByFormationIdAndUfCodeAndQuizType(
            UUID formationId, String ufCode, ma.iatacademy.api.domain.enums.QuizType quizType);
    Optional<Quiz> findByFormationIdAndYearNumberAndQuizType(
            UUID formationId, Integer yearNumber, ma.iatacademy.api.domain.enums.QuizType quizType);
    List<Quiz> findByModuleIdOrderByCreatedAtDesc(UUID moduleId);
    List<Quiz> findAllByOrderByCreatedAtDesc();
    List<Quiz> findByLessonIdIn(List<UUID> lessonIds);
    Page<Quiz> findByModuleId(UUID moduleId, Pageable pageable);
}
