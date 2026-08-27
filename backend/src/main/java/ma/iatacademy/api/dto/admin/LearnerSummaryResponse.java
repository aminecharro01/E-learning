package ma.iatacademy.api.dto.admin;

import java.util.UUID;

public record LearnerSummaryResponse(
        UUID id,
        String email,
        String fullName,
        boolean enabled,
        double completionPercent,
        int completedModules,
        int totalModules,
        UUID avatarAssetId
) {
}
