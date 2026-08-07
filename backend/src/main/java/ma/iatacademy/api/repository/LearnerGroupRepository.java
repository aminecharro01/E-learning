package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LearnerGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearnerGroupRepository extends JpaRepository<LearnerGroup, UUID> {
    List<LearnerGroup> findAllByOrderByCreatedAtDesc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByCodeIgnoreCase(String code);
}
