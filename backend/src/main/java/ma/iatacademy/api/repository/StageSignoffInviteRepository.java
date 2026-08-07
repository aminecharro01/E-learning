package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.StageSignoffInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StageSignoffInviteRepository extends JpaRepository<StageSignoffInvite, UUID> {
    Optional<StageSignoffInvite> findByToken(String token);
}
