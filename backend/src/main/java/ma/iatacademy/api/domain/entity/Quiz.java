package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.QuizQuestionMode;
import ma.iatacademy.api.domain.enums.QuizType;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quiz extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "quiz_type", nullable = false, length = 30)
    private QuizType quizType;

    /** Fixé à la création, verrouille le type de question accepté pour tout le quiz — voir QuizQuestionMode. */
    @Enumerated(EnumType.STRING)
    @Column(name = "question_mode", nullable = false, length = 20)
    @Builder.Default
    private QuizQuestionMode questionMode = QuizQuestionMode.AUTO_GRADED;

    /** Optional link to a lesson (section quiz). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    /** Optional link to a module (end-of-module quiz). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private ModuleEntity module;

    /** Only set for FIN_UF/FIN_ANNEE — neither a UF nor a year has any other FK to hang
     *  off of, so these three scalar fields identify the scope directly instead. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "formation_id")
    private Formation formation;

    /** FIN_UF only — matches ModuleEntity#ufCode across every module in that UF. */
    @Column(name = "uf_code", length = 20)
    private String ufCode;

    /** FIN_ANNEE only — matches ModuleEntity#yearNumber (1 or 2). */
    @Column(name = "year_number")
    private Integer yearNumber;

    /** TODO: à valider avec le client — default 50 for section / 60 for module */
    @Column(name = "passing_score", nullable = false)
    private int passingScore;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts;

    @Column(name = "time_limit_seconds", nullable = false)
    @Builder.Default
    private int timeLimitSeconds = 0;

    @Column(name = "randomize_questions", nullable = false)
    @Builder.Default
    private boolean randomizeQuestions = true;

    @Column(name = "randomize_options", nullable = false)
    @Builder.Default
    private boolean randomizeOptions = true;

    @Column(name = "retry_delay_minutes", nullable = false)
    @Builder.Default
    private int retryDelayMinutes = 1440;

    /** When true, failing the quiz blocks progress to the next section/module. */
    @Column(name = "blocking", nullable = false)
    @Builder.Default
    private boolean blocking = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean published = false;

    /** Anti-triche optionnel — jamais activé par défaut, décision du directeur par quiz. */
    @Column(name = "proctoring_enabled", nullable = false)
    @Builder.Default
    private boolean proctoringEnabled = false;

    @Column(name = "focus_loss_detection", nullable = false)
    @Builder.Default
    private boolean focusLossDetection = false;

    @Column(name = "copy_protection", nullable = false)
    @Builder.Default
    private boolean copyProtection = false;

    @Column(name = "lockdown_mode", nullable = false)
    @Builder.Default
    private boolean lockdownMode = false;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Question> questions = new ArrayList<>();
}
