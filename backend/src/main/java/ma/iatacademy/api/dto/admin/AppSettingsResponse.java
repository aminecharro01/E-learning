package ma.iatacademy.api.dto.admin;

public record AppSettingsResponse(
        String platformName,
        String supportEmail,
        boolean registrationEnabled,
        String defaultResetPassword,
        String year2OpeningDate
) {
}
