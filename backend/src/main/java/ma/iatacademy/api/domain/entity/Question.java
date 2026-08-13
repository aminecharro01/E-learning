package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.QuestionType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Nullable : une question appartient soit à un quiz, soit à une banque (voir questionBank). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_bank_id")
    private QuestionBank questionBank;

    /** Renseigné quand cette question a été clonée depuis une banque lors de la génération d'un examen. */
    @Column(name = "source_bank_item_id")
    private UUID sourceBankItemId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 30)
    private QuestionType questionType;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    /** Optional illustration for the question prompt (uploaded asset). */
    @Column(name = "image_asset_id")
    private UUID imageAssetId;

    /**
     * Configuration spécifique au type : ESSAY → {@code {maxLength}} (optionnel).
     * Null pour les types à choix (SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE).
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<AnswerOption> options = new ArrayList<>();
}
