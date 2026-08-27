package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppSettingsRequest(
        @NotBlank @Size(max = 120) String platformName,
        @Size(max = 180) String supportEmail,
        boolean registrationEnabled,
        @NotBlank @Size(min = 8, max = 100) String defaultResetPassword,
        /** Date ISO yyyy-MM-dd ou vide pour désactiver l'ouverture auto. */
        String year2OpeningDate,
        @NotBlank String themeVariant,
        /** Fenêtre annuelle stage & soutenance (ISO yyyy-MM-dd), vide = pas de restriction. */
        String stageStartDate,
        String stageEndDate
) {
}
