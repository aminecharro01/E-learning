package ma.iatacademy.api.dto.quiz;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record QuizQuestionPublic(
        UUID id,
        String prompt,
        String questionType,
        int orderIndex,
        UUID imageAssetId,
        List<QuizOptionPublic> options,
        /** Redigée : ne contient jamais la réponse attendue (voir QuizService#redactMetadata). */
        Map<String, Object> metadata
) {
}
