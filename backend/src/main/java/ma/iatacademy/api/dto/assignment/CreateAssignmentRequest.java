package ma.iatacademy.api.dto.assignment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateAssignmentRequest(
        @NotNull UUID moduleId,
        @NotBlank String title,
        String description,
        Instant dueAt,
        BigDecimal maxScore
) {
}
