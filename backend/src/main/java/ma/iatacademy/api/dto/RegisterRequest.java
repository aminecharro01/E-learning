package ma.iatacademy.api.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.iatacademy.api.domain.enums.Civility;

public record RegisterRequest(
        @NotNull Civility civility,
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Size(max = 120) String city,
        @NotBlank @Size(max = 40) String phone,
        @NotBlank @Email String email,
        @NotBlank @Size(max = 120) String educationLevel,
        @NotBlank @Size(max = 120) String lastSchoolType,
        @NotBlank @Size(min = 8, max = 100)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Le mot de passe doit contenir au moins une lettre et un chiffre."
        )
        String password,
        @AssertTrue(message = "Vous devez accepter les conditions d'utilisation.")
        boolean termsAccepted
) {
}
