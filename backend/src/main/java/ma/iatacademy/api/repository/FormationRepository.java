package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Formation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FormationRepository extends JpaRepository<Formation, UUID> {
}
