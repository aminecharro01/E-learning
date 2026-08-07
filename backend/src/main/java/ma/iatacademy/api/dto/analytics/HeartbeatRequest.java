package ma.iatacademy.api.dto.analytics;

import jakarta.validation.constraints.NotNull;

public record HeartbeatRequest(
        @NotNull Integer deltaSeconds
) {
}
