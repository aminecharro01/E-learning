package ma.iatacademy.api.dto.group;

import java.math.BigDecimal;
import java.util.UUID;

public record LeaderboardEntryResponse(
        int rank,
        UUID userId,
        String fullName,
        BigDecimal averageScore
) {
}
