package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record BulkSetEnabledRequest(
        @NotEmpty List<UUID> userIds,
        @NotNull Boolean enabled
) {
}
