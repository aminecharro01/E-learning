package ma.iatacademy.api.dto.campaign;

import ma.iatacademy.api.domain.enums.CampaignAudience;
import ma.iatacademy.api.domain.enums.CampaignStatus;

import java.time.Instant;
import java.util.UUID;

public record CampaignResponse(
        UUID id,
        String subject,
        CampaignStatus status,
        CampaignAudience targetAudience,
        Instant sentAt,
        int recipientCount,
        long sentCount,
        long failedCount
) {
}
