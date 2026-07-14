package ma.iatacademy.api.dto.quiz;

import ma.iatacademy.api.domain.enums.AttemptStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record QuizSubmitResponse(
        UUID attemptId,
        BigDecimal score,
        int passingScore,
        AttemptStatus status,
        boolean passed,
        Instant submittedAt,
        boolean preview
) {
}
