package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface JobOfferRepository extends JpaRepository<JobOffer, UUID> {
    List<JobOffer> findAllByOrderByCreatedAtDesc();

    @Query("""
            SELECT j FROM JobOffer j
            WHERE j.published = true AND (j.expiresAt IS NULL OR j.expiresAt > :now)
            ORDER BY j.createdAt DESC
            """)
    List<JobOffer> findActive(Instant now);
}
