package ma.iatacademy.api.dto.assignment;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record GradeSubmissionRequest(
        @NotNull BigDecimal grade,
        String feedback
) {
}
