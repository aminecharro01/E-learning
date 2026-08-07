package ma.iatacademy.api.dto.assignment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(
        UUID id,
        UUID moduleId,
        String title,
        String description,
        Instant dueAt,
        BigDecimal maxScore,
        long submissionCount
) {
}
