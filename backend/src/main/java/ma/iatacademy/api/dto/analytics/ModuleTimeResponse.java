package ma.iatacademy.api.dto.analytics;

import java.util.UUID;

public record ModuleTimeResponse(
        UUID lessonId,
        String lessonTitle,
        long totalSeconds
) {
}
