package ma.iatacademy.api.dto;

import jakarta.validation.constraints.Size;
import ma.iatacademy.api.domain.enums.Civility;

import java.time.LocalDate;

public record UpdateProfileRequest(
        @Size(max = 255) String fullName,
        Civility civility,
        @Size(max = 120) String firstName,
        @Size(max = 120) String lastName,
        @Size(max = 80) String country,
        @Size(max = 120) String city,
        @Size(max = 120) String educationLevel,
        @Size(max = 120) String lastSchoolType,
        @Size(max = 40) String phone,
        @Size(max = 40) String cin,
        LocalDate birthDate,
        String address
) {
}
