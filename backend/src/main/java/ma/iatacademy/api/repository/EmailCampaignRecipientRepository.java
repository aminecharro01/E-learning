package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.EmailCampaignRecipient;
import ma.iatacademy.api.domain.enums.CampaignRecipientStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailCampaignRecipientRepository extends JpaRepository<EmailCampaignRecipient, UUID> {
    List<EmailCampaignRecipient> findByCampaignId(UUID campaignId);
    long countByCampaignIdAndStatus(UUID campaignId, CampaignRecipientStatus status);
}
