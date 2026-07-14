package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
    List<QuizAttempt> findByUserIdAndQuizIdOrderByStartedAtDesc(UUID userId, UUID quizId);
    long countByUserIdAndQuizIdAndStatusIn(UUID userId, UUID quizId, List<AttemptStatus> statuses);
    Optional<QuizAttempt> findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
            UUID userId, UUID quizId, AttemptStatus status);
}
