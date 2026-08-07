package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, UUID> {
    List<ProctoringEvent> findByAttemptIdOrderByOccurredAtAsc(UUID attemptId);

    long countByAttemptId(UUID attemptId);
}
