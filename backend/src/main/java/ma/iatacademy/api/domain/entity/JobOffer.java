package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.ContractType;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "job_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobOffer extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 255)
    private String company;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", nullable = false, length = 20)
    private ContractType contractType;

    @Column(name = "apply_url", length = 500)
    private String applyUrl;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by")
    private User postedBy;

    /** Illustration optionnelle de l'offre (logo entreprise, visuel poste). */
    @Column(name = "photo_asset_id")
    private UUID photoAssetId;

    @Column(nullable = false)
    @Builder.Default
    private boolean published = true;

    @Column(name = "expires_at")
    private Instant expiresAt;
}
