package ma.iatacademy.api.dto.quiz;

import java.util.List;

public record AiGenerationResponse(
        int generatedCount,
        List<RowError> errors
) {
}
