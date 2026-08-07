package ma.iatacademy.api.dto.messaging;

import ma.iatacademy.api.domain.enums.ConversationType;

import java.time.Instant;
import java.util.UUID;

public record ConversationResponse(
        UUID id,
        ConversationType type,
        String title,
        String lastMessagePreview,
        Instant lastMessageAt
) {
}
