package ma.iatacademy.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompleteProfileRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(max = 40) String phone,
        @NotBlank @Size(min = 8, max = 100)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Le mot de passe doit contenir au moins une lettre et un chiffre."
        )
        String newPassword
) {
}
