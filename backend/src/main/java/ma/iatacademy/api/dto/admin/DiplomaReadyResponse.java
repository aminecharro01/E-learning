package ma.iatacademy.api.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record DiplomaReadyResponse(
        UUID certificateId,
        UUID userId,
        String learnerName,
        String email,
        String verificationCode,
        Instant issuedAt,
        boolean physicallyDelivered,
        Instant deliveredAt,
        String deliveredNote
) {
}
