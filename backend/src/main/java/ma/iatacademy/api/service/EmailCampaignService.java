package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.EmailCampaign;
import ma.iatacademy.api.domain.entity.EmailCampaignRecipient;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.CampaignAudience;
import ma.iatacademy.api.domain.enums.CampaignRecipientStatus;
import ma.iatacademy.api.domain.enums.CampaignStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.campaign.CampaignResponse;
import ma.iatacademy.api.dto.campaign.CreateCampaignRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.EmailCampaignRecipientRepository;
import ma.iatacademy.api.repository.EmailCampaignRepository;
import ma.iatacademy.api.repository.LearnerGroupRepository;
import ma.iatacademy.api.repository.NewsletterSubscriberRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Envoi de masse : la file d'attente est simplement la liste des EmailCampaignRecipient
 * en statut PENDING (pas de file Redis séparée — plus simple à reprendre après un
 * redémarrage, puisque l'état vit déjà en base). @Async fournit le "en tâche de fond" ;
 * le seul rôle de Redis ici est indirect (le RateLimitService partagé, réutilisable si
 * besoin de brider le débit d'envoi par IP côté API plus tard).
 * Envoie via EmailService (SMTP) — brancher Resend/Brevo/Postmark reviendrait à changer
 * l'implémentation d'un seul point d'appel ci-dessous.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailCampaignService {

    private final EmailCampaignRepository campaignRepository;
    private final EmailCampaignRecipientRepository recipientRepository;
    private final NewsletterSubscriberRepository newsletterSubscriberRepository;
    private final UserRepository userRepository;
    private final LearnerGroupRepository groupRepository;
    private final CampaignSenderWorker campaignSenderWorker;

    @Transactional
    public CampaignResponse create(CreateCampaignRequest request, UUID actorId) {
        EmailCampaign campaign = EmailCampaign.builder()
                .subject(request.subject().trim())
                .htmlBody(request.htmlBody())
                .targetAudience(request.targetAudience())
                .targetGroup(request.targetGroupId() != null ? groupRepository.getReferenceById(request.targetGroupId()) : null)
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        campaignRepository.save(campaign);
        return toResponse(campaign);
    }

    @Transactional(readOnly = true)
    public List<CampaignResponse> list() {
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public void send(UUID campaignId) {
        EmailCampaign campaign = requireCampaign(campaignId);
        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new ApiException("Cette campagne a déjà été envoyée ou est en cours d'envoi.");
        }
        List<EmailCampaignRecipient> recipients = resolveRecipients(campaign);
        if (recipients.isEmpty()) {
            throw new ApiException("Aucun destinataire pour cette audience.");
        }
        recipientRepository.saveAll(recipients);
        campaign.setStatus(CampaignStatus.SENDING);
        campaign.setRecipientCount(recipients.size());
        campaignRepository.save(campaign);

        campaignSenderWorker.sendAsync(campaignId);
    }

    private List<EmailCampaignRecipient> resolveRecipients(EmailCampaign campaign) {
        return switch (campaign.getTargetAudience()) {
            case NEWSLETTER_SUBSCRIBERS -> newsletterSubscriberRepository.findByActiveTrue().stream()
                    .map(s -> EmailCampaignRecipient.builder().campaign(campaign).recipientEmail(s.getEmail()).build())
                    .toList();
            case ALL_STUDENTS -> userRepository.findByRole(Role.ETUDIANT).stream()
                    .filter(u -> u.getEmail() != null && u.isEmailVerified())
                    .map(u -> EmailCampaignRecipient.builder().campaign(campaign)
                            .recipientEmail(u.getEmail()).recipientName(u.getFullName()).build())
                    .toList();
            case SPECIFIC_GROUP -> {
                if (campaign.getTargetGroup() == null) {
                    throw new ApiException("Groupe cible requis pour cette audience.");
                }
                yield userRepository.findByGroupIdOrderByFullNameAsc(campaign.getTargetGroup().getId()).stream()
                        .filter(u -> u.getEmail() != null && u.isEmailVerified())
                        .map((User u) -> EmailCampaignRecipient.builder().campaign(campaign)
                                .recipientEmail(u.getEmail()).recipientName(u.getFullName()).build())
                        .toList();
            }
        };
    }

    private EmailCampaign requireCampaign(UUID id) {
        return campaignRepository.findById(id).orElseThrow(() -> new NotFoundException("Campagne introuvable."));
    }

    private CampaignResponse toResponse(EmailCampaign c) {
        long sent = recipientRepository.countByCampaignIdAndStatus(c.getId(), CampaignRecipientStatus.SENT);
        long failed = recipientRepository.countByCampaignIdAndStatus(c.getId(), CampaignRecipientStatus.FAILED);
        return new CampaignResponse(c.getId(), c.getSubject(), c.getStatus(), c.getTargetAudience(),
                c.getSentAt(), c.getRecipientCount(), sent, failed);
    }
}
