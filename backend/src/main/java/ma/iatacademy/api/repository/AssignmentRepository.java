package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
    List<Assignment> findByModuleIdOrderByDueAtAsc(UUID moduleId);
}
