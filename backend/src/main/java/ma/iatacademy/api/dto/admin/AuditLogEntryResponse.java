package ma.iatacademy.api.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AuditLogEntryResponse(
        UUID id,
        String actorName,
        String action,
        String targetType,
        UUID targetId,
        String metadata,
        Instant createdAt
) {
}
