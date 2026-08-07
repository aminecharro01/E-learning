package ma.iatacademy.api.dto.gradebook;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record GradebookResponse(
        List<EvaluationColumn> evaluations,
        List<StudentRow> rows
) {
    public record EvaluationColumn(UUID id, String label, String type) {
    }

    public record StudentRow(
            UUID userId,
            String fullName,
            Map<String, BigDecimal> scores,
            BigDecimal bonus,
            BigDecimal average
    ) {
    }
}
