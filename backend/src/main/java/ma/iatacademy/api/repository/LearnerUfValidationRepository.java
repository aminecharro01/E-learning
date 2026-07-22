package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LearnerUfValidation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearnerUfValidationRepository extends JpaRepository<LearnerUfValidation, UUID> {
    Optional<LearnerUfValidation> findByLearnerIdAndUfCode(UUID learnerId, String ufCode);

    List<LearnerUfValidation> findByLearnerId(UUID learnerId);
}
