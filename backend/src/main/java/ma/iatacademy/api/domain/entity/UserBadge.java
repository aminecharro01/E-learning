package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.BadgeCode;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_code", nullable = false, length = 50)
    private BadgeCode badgeCode;

    @Column(name = "awarded_at", nullable = false)
    private Instant awardedAt;

    /** Code public court, sur le modèle de Certificate.verificationCode — sert la page
     *  publique de partage (/achievements/{code}) et l'image LinkedIn associée. */
    @Column(name = "share_code", nullable = false, unique = true, length = 20)
    private String shareCode;
}
