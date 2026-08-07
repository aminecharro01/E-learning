package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByAssignmentId(UUID assignmentId);
    Optional<Submission> findByAssignmentIdAndUserId(UUID assignmentId, UUID userId);
    List<Submission> findByUserId(UUID userId);
}
