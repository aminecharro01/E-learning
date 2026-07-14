package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.Role;

public record UpdateRoleRequest(@NotNull Role role) {
}
