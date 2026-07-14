package ma.iatacademy.api.dto.media;

public record SignedStreamResponse(
        String url,
        long expiresAtEpochSeconds
) {
}
