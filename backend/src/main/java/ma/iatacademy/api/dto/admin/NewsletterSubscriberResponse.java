package ma.iatacademy.api.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record NewsletterSubscriberResponse(
        UUID id,
        String email,
        boolean active,
        Instant createdAt
) {
}
