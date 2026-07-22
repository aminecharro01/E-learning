package ma.iatacademy.api.dto.stage;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ValidateUfRequest(
        @NotBlank String ufCode,
        @NotNull Boolean validated,
        String note
) {
}
