package ma.iatacademy.api.dto.badge;

import java.time.Instant;

public record BadgeResponse(
        String code,
        String label,
        String description,
        String icon,
        boolean earned,
        Instant awardedAt,
        /** Null tant que le badge n'est pas obtenu — sert /achievements/{code}. */
        String shareCode
) {
}
