package ma.iatacademy.api.dto.lesson;

import java.time.Instant;
import java.util.UUID;

public record LessonLockResponse(
        UUID lessonId,
        UUID lockedBy,
        String lockedByName,
        Instant lockedAt,
        Instant expiresAt
) {
}
