package ma.iatacademy.api.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record ContactMessageResponse(
        UUID id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String message,
        String status,
        Instant createdAt
) {
}
