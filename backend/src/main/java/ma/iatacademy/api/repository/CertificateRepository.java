package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    /** JOIN FETCH is required here: CertificateController#toResponse reads
     * cert.getFormation().getTitle() / cert.getUser().getFullName() after the
     * @Transactional service call has already returned (session closed), so a plain
     * lazy association throws LazyInitializationException the first time a real
     * certificate exists — never hit before since no demo data had one until now. */
    @Query("SELECT c FROM Certificate c JOIN FETCH c.formation JOIN FETCH c.user WHERE c.user.id = :userId AND c.formation.id = :formationId")
    Optional<Certificate> findByUserIdAndFormationId(@Param("userId") UUID userId, @Param("formationId") UUID formationId);

    @Query("SELECT c FROM Certificate c JOIN FETCH c.formation JOIN FETCH c.user WHERE c.verificationCode = :verificationCode")
    Optional<Certificate> findByVerificationCode(@Param("verificationCode") String verificationCode);
}
