package ma.iatacademy.api.dto.certificate;

import java.time.Instant;
import java.util.UUID;

public record CertificateResponse(
        UUID id,
        String verificationCode,
        Instant issuedAt,
        String formationTitle,
        String learnerName
) {
}
