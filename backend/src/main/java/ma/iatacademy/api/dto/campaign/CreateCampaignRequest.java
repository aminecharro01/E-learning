package ma.iatacademy.api.dto.campaign;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.CampaignAudience;

import java.util.UUID;

public record CreateCampaignRequest(
        @NotBlank String subject,
        @NotBlank String htmlBody,
        @NotNull CampaignAudience targetAudience,
        UUID targetGroupId
) {
}
