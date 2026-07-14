package ma.iatacademy.api.dto.progress;

import java.time.Instant;
import java.util.UUID;

public record LessonProgressResponse(
        UUID lessonId,
        int videoWatchedPercent,
        boolean completed,
        Instant completedAt
) {
}
