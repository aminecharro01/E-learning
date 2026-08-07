package ma.iatacademy.api.dto.assignment;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateGradeAdjustmentRequest(
        @NotNull UUID userId,
        @NotNull UUID moduleId,
        @NotNull BigDecimal points,
        String reason
) {
}
