package ma.iatacademy.api.dto.stage;

import java.time.Instant;

public record SignoffInviteView(
        String learnerName,
        String ufCode,
        boolean alreadyValidated,
        Instant expiresAt
) {
}
