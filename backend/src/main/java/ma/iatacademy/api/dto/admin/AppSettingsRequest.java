package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppSettingsRequest(
        @NotBlank @Size(max = 120) String platformName,
        @Size(max = 180) String supportEmail,
        boolean registrationEnabled,
        @NotBlank @Size(min = 8, max = 100) String defaultResetPassword
) {
}
