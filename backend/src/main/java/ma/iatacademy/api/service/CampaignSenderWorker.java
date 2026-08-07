package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.EmailCampaign;
import ma.iatacademy.api.domain.entity.EmailCampaignRecipient;
import ma.iatacademy.api.domain.enums.CampaignRecipientStatus;
import ma.iatacademy.api.domain.enums.CampaignStatus;
import ma.iatacademy.api.repository.EmailCampaignRecipientRepository;
import ma.iatacademy.api.repository.EmailCampaignRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Séparé de EmailCampaignService à dessein : @Async n'a aucun effet sur un appel
 * qu'une méthode se fait à elle-même dans la même classe (le proxy Spring AOP est
 * contourné) — il faut passer par un bean distinct pour que l'exécution soit
 * réellement asynchrone, via le pool dédié campaignTaskExecutor (voir AsyncConfig).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignSenderWorker {

    private final EmailCampaignRepository campaignRepository;
    private final EmailCampaignRecipientRepository recipientRepository;
    private final EmailService emailService;

    @Async("campaignTaskExecutor")
    @Transactional
    public void sendAsync(UUID campaignId) {
        EmailCampaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null) {
            return;
        }
        List<EmailCampaignRecipient> pending = recipientRepository.findByCampaignId(campaignId).stream()
                .filter(r -> r.getStatus() == CampaignRecipientStatus.PENDING)
                .toList();
        for (EmailCampaignRecipient recipient : pending) {
            try {
                emailService.send(recipient.getRecipientEmail(), campaign.getSubject(), campaign.getHtmlBody());
                recipient.setStatus(CampaignRecipientStatus.SENT);
                recipient.setSentAt(Instant.now());
            } catch (Exception e) {
                log.warn("Échec d'envoi campagne à {}", recipient.getRecipientEmail(), e);
                recipient.setStatus(CampaignRecipientStatus.FAILED);
            }
            recipientRepository.save(recipient);
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        campaign.setStatus(CampaignStatus.SENT);
        campaign.setSentAt(Instant.now());
        campaignRepository.save(campaign);
    }
}
