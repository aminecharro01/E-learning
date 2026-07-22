package ma.iatacademy.api.dto;

import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String fullName,
        Role role,
        boolean enabled,
        String phone,
        String cin,
        LocalDate birthDate,
        String address,
        Integer enrollmentYear,
        PaymentStatus paymentStatus,
        Instant activatedAt,
        boolean year2AccessEnabled,
        UUID avatarAssetId
) {
}
