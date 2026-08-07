package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.EnrollmentMode;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "learner_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearnerGroup extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    /** Millésime de promo (ex. "2026-A"), optionnel. */
    @Column(length = 30)
    private String code;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "enrollment_mode", nullable = false, length = 20)
    @Builder.Default
    private EnrollmentMode enrollmentMode = EnrollmentMode.HYBRIDE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
}
