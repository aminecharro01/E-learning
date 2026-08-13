package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.List;
import java.util.Map;

public record CreateQuestionRequest(
        @NotBlank String prompt,
        @NotNull QuestionType questionType,
        String explanation,
        java.util.UUID imageAssetId,
        /** Requis pour SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE, ignoré pour ESSAY. */
        List<CreateOptionRequest> options,
        /** Config spécifique au type — maxLength (ESSAY). */
        Map<String, Object> metadata
) {
}
