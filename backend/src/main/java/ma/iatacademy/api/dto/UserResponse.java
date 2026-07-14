package ma.iatacademy.api.dto;

import ma.iatacademy.api.domain.enums.Role;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        Role role
) {
}
