package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.List;
import java.util.Map;

public record CreateQuestionRequest(
        @NotBlank String prompt,
        @NotNull QuestionType questionType,
        @NotNull Integer orderIndex,
        String explanation,
        java.util.UUID imageAssetId,
        /** Requis pour SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE, ignoré pour les autres types. */
        List<CreateOptionRequest> options,
        /** Config spécifique au type — pairs (MATCHING), zones (HOTSPOT), acceptedAnswers (FILL_BLANK). */
        Map<String, Object> metadata
) {
}
