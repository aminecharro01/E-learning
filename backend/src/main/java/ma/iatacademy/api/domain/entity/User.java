package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.Civility;
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
    @Column(length = 10)
    private Civility civility;

    @Column(name = "first_name", length = 120)
    private String firstName;

    @Column(name = "last_name", length = 120)
    private String lastName;

    @Column(length = 80)
    private String country;

    @Column(length = 120)
    private String city;

    @Column(name = "education_level", length = 120)
    private String educationLevel;

    @Column(name = "last_school_type", length = 120)
    private String lastSchoolType;

    @Column(name = "terms_accepted_at")
    private Instant termsAcceptedAt;

    @Column(name = "marketing_opt_in", nullable = false)
    @Builder.Default
    private boolean marketingOptIn = false;

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

    @Column(name = "reset_token", length = 255)
    private String resetToken;

    @Column(name = "reset_token_expires_at")
    private Instant resetTokenExpiresAt;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = true;

    @Column(name = "verification_token", length = 255)
    private String verificationToken;

    @Column(name = "verification_token_expires_at")
    private Instant verificationTokenExpiresAt;

    /** 2FA optionnelle (TOTP) — jamais exposée dans UserResponse. */
    @Column(name = "totp_secret", length = 64)
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false)
    @Builder.Default
    private boolean totpEnabled = false;

    /**
     * Groupe présentiel/hybride. Null = apprenant 100% en ligne (progression
     * automatique classique). Non-null = progression pilotée par le directeur.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private LearnerGroup group;

    /** Identifiant de connexion initial des comptes importés (CIN / matricule). */
    @Column(length = 60)
    private String matricule;

    /** False tant que l'apprenant importé n'a pas saisi email réel + mot de passe perso. */
    @Column(name = "profile_completed", nullable = false)
    @Builder.Default
    private boolean profileCompleted = true;
}
