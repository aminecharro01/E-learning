package ma.iatacademy.api.dto.assignment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LearnerAssignmentResponse(
        UUID id,
        UUID moduleId,
        String moduleTitle,
        String title,
        String description,
        Instant dueAt,
        BigDecimal maxScore,
        SubmissionResponse mySubmission
) {
}
