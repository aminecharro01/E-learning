package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.ModuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModuleRepository extends JpaRepository<ModuleEntity, UUID> {
    List<ModuleEntity> findByFormationIdOrderByOrderIndexAsc(UUID formationId);
}
