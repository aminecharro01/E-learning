package ma.iatacademy.api.dto.analytics;

import java.time.Instant;
import java.util.UUID;

public record InactiveStudentResponse(
        UUID userId,
        String fullName,
        Instant lastActivity,
        long daysInactive
) {
}
