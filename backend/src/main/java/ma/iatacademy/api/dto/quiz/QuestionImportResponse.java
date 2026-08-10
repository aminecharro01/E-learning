package ma.iatacademy.api.dto.quiz;

import java.util.List;

public record QuestionImportResponse(
        int importedCount,
        List<RowError> errors
) {
    public record RowError(int rowNumber, String reason) {
    }
}
