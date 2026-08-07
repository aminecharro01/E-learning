package ma.iatacademy.api.dto.messaging;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID senderId,
        String senderName,
        String body,
        Instant createdAt
) {
}
