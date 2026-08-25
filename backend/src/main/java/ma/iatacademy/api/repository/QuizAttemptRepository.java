package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    /** Serializes concurrent start() calls for the same user+quiz so the "check for an
     * existing attempt, else create one" logic in QuizAttemptService can't race — without
     * this, N simultaneous requests each see "no open attempt" and each create their own row
     * (reproduced by loadtest/quiz-start-concurrency.js). Transaction-scoped: released
     * automatically when the calling @Transactional method commits or rolls back. */
    @org.springframework.data.jpa.repository.Query(
            value = "SELECT pg_advisory_xact_lock(hashtext(:lockKey))", nativeQuery = true)
    void acquireStartLock(@org.springframework.data.repository.query.Param("lockKey") String lockKey);

    List<QuizAttempt> findByUserIdAndQuizIdOrderByStartedAtDesc(UUID userId, UUID quizId);
    List<QuizAttempt> findByUserIdAndStatusInOrderByStartedAtDesc(UUID userId, List<AttemptStatus> statuses);
    long countByUserIdAndQuizIdAndStatusIn(UUID userId, UUID quizId, List<AttemptStatus> statuses);
    Optional<QuizAttempt> findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
            UUID userId, UUID quizId, AttemptStatus status);

    long countByStatusIn(List<AttemptStatus> statuses);

    List<QuizAttempt> findByStatusOrderBySubmittedAtAsc(AttemptStatus status);
    List<QuizAttempt> findByQuizIdAndStatusOrderBySubmittedAtAsc(UUID quizId, AttemptStatus status);
    List<QuizAttempt> findByQuizIdOrderByStartedAtDesc(UUID quizId);

    @Query("SELECT AVG(a.score) FROM QuizAttempt a WHERE a.status IN :statuses AND a.score IS NOT NULL")
    Double averageScoreByStatusIn(@Param("statuses") List<AttemptStatus> statuses);

    /** Classement de cohorte : score moyen par apprenant, meilleures tentatives uniquement. */
    @Query("SELECT a.user.id, AVG(a.score) FROM QuizAttempt a "
            + "WHERE a.user.group.id = :groupId AND a.status IN :statuses AND a.score IS NOT NULL "
            + "GROUP BY a.user.id")
    List<Object[]> averageScoreByGroupGroupedByUser(@Param("groupId") UUID groupId, @Param("statuses") List<AttemptStatus> statuses);
}
