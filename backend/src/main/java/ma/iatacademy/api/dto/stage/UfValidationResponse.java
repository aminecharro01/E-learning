package ma.iatacademy.api.dto.stage;

import java.time.Instant;
import java.util.UUID;

public record UfValidationResponse(
        String ufCode,
        boolean validated,
        Instant validatedAt,
        String validatedByName,
        String note
) {
}
