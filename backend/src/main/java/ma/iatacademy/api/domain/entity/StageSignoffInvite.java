package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stage_signoff_invites")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StageSignoffInvite extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uf_validation_id", nullable = false)
    private LearnerUfValidation ufValidation;

    @Column(nullable = false, unique = true, length = 255)
    private String token;

    @Column(name = "tutor_email", nullable = false, length = 255)
    private String tutorEmail;

    @Column(name = "tutor_name", length = 255)
    private String tutorName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;
}
