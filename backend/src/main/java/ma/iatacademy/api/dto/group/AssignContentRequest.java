package ma.iatacademy.api.dto.group;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record AssignContentRequest(
        @NotNull TargetType targetType,
        /** Requis si targetType = MODULE. */
        UUID moduleId,
        /** Requis si targetType = UF — tous les modules de cette UF sont affectés. */
        String ufCode,
        /** Null = ouverture immédiate. */
        Instant unlockAt
) {
    public enum TargetType {
        MODULE,
        UF
    }
}
