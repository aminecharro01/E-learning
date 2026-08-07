package ma.iatacademy.api.dto.group;

import java.time.Instant;
import java.util.UUID;

public record AssignmentResponse(
        UUID id,
        UUID moduleId,
        String moduleTitle,
        String ufCode,
        Instant unlockAt,
        boolean unlocked
) {
}
