package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.EssayGrade;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EssayGradeRepository extends JpaRepository<EssayGrade, UUID> {
    List<EssayGrade> findByAttemptId(UUID attemptId);

    Optional<EssayGrade> findByAttemptIdAndQuestionId(UUID attemptId, UUID questionId);
}
