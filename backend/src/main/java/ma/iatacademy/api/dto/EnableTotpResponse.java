package ma.iatacademy.api.dto;

public record EnableTotpResponse(
        String secret,
        String otpauthUri
) {
}
