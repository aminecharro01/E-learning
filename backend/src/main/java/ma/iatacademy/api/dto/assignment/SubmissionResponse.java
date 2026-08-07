package ma.iatacademy.api.dto.assignment;

import ma.iatacademy.api.domain.enums.SubmissionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SubmissionResponse(
        UUID id,
        UUID assignmentId,
        UUID userId,
        String userFullName,
        UUID assetId,
        Instant submittedAt,
        SubmissionStatus status,
        BigDecimal grade,
        String feedback
) {
}
