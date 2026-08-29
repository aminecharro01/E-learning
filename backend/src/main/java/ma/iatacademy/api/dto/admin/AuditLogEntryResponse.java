package ma.iatacademy.api.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AuditLogEntryResponse(
        UUID id,
        String actorName,
        String action,
        String targetType,
        UUID targetId,
        /** Nom lisible de la cible (utilisateur ou groupe) — null si la cible a été
         *  supprimée depuis, ou si le type de cible n'est pas résoluble. */
        String targetName,
        String metadata,
        Instant createdAt
) {
}
