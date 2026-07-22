package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(length = 40)
    private String phone;

    @Column(length = 40)
    private String cin;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "enrollment_year")
    private Integer enrollmentYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(name = "activated_at")
    private Instant activatedAt;

    /** Année 2 ouverte pour cet apprenant (rentrée suivante après UF 5). */
    @Column(name = "year2_access_enabled", nullable = false)
    @Builder.Default
    private boolean year2AccessEnabled = false;

    /** Photo de profil (asset IMAGE). */
    @Column(name = "avatar_asset_id")
    private UUID avatarAssetId;
}
