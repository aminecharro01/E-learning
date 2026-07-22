package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotNull;

public record UpdateYear2AccessRequest(@NotNull Boolean year2AccessEnabled) {
}
