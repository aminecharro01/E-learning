package ma.iatacademy.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TotpCodeRequest(
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Code à 6 chiffres attendu.") String code
) {
}
