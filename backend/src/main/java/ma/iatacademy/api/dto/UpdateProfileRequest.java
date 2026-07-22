package ma.iatacademy.api.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(
        @Size(max = 255) String fullName,
        @Size(max = 40) String phone,
        @Size(max = 40) String cin,
        LocalDate birthDate,
        String address
) {
}
