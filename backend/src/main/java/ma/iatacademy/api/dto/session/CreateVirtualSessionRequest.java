package ma.iatacademy.api.dto.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.SessionProvider;

import java.time.Instant;
import java.util.UUID;

public record CreateVirtualSessionRequest(
        UUID moduleId,
        @NotNull UUID groupId,
        @NotBlank String title,
        @NotNull SessionProvider provider,
        @NotBlank String joinUrl,
        @NotNull Instant scheduledAt,
        Integer durationMinutes
) {
}
