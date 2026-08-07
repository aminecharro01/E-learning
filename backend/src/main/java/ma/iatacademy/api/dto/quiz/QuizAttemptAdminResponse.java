package ma.iatacademy.api.dto.quiz;

import ma.iatacademy.api.domain.enums.AttemptStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record QuizAttemptAdminResponse(
        UUID id,
        UUID userId,
        String userFullName,
        AttemptStatus status,
        BigDecimal score,
        Instant startedAt,
        Instant submittedAt,
        long proctoringEventCount
) {
}
