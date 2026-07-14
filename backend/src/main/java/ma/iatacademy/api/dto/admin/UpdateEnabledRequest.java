package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotNull;

public record UpdateEnabledRequest(@NotNull Boolean enabled) {
}
