package ma.iatacademy.api.dto.quiz;

import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.List;
import java.util.UUID;

public record QuestionAdminResponse(
        UUID id,
        UUID quizId,
        String prompt,
        QuestionType questionType,
        int orderIndex,
        String explanation,
        UUID imageAssetId,
        List<OptionAdminResponse> options
) {
    public record OptionAdminResponse(
            UUID id,
            String label,
            boolean correct,
            int orderIndex
    ) {
    }
}
