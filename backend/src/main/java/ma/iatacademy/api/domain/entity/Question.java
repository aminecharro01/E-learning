package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.ArrayList;
import java.util.List;
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

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

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<AnswerOption> options = new ArrayList<>();
}
