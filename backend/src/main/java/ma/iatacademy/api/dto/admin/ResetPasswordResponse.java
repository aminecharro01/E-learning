package ma.iatacademy.api.dto.admin;

public record ResetPasswordResponse(
        String message,
        String temporaryPassword
) {
}
