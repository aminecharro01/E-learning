package ma.iatacademy.api.dto.session;

import ma.iatacademy.api.domain.enums.SessionProvider;

import java.time.Instant;
import java.util.UUID;

public record VirtualSessionResponse(
        UUID id,
        UUID moduleId,
        UUID groupId,
        String groupName,
        String title,
        SessionProvider provider,
        String joinUrl,
        Instant scheduledAt,
        int durationMinutes
) {
}
