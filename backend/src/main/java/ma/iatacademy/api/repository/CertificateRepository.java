package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {
    Optional<Certificate> findByUserIdAndFormationId(UUID userId, UUID formationId);
    Optional<Certificate> findByVerificationCode(String verificationCode);
}
