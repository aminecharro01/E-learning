package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.config.EmailProperties;
import ma.iatacademy.api.domain.entity.LearnerUfValidation;
import ma.iatacademy.api.domain.entity.StageSignoffInvite;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.stage.CreateSignoffInviteRequest;
import ma.iatacademy.api.dto.stage.SignOffRequest;
import ma.iatacademy.api.dto.stage.SignoffInviteView;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.GoneException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LearnerUfValidationRepository;
import ma.iatacademy.api.repository.StageSignoffInviteRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * External stage tutors have no User account — a signed, single-use, expiring
 * token stands in for auth, scoped to exactly one UF validation. This avoids a
 * second registration/login system for a one-off external action.
 */
@Service
@RequiredArgsConstructor
public class StageSignoffService {

    private static final Duration INVITE_TTL = Duration.ofDays(7);

    private final StageSignoffInviteRepository inviteRepository;
    private final LearnerUfValidationRepository ufValidationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailProperties emailProperties;
    private final AppPlatformProperties appPlatformProperties;
    private final NotificationService notificationService;
    private final BadgeService badgeService;
    private final ProgressionService progressionService;

    @Transactional
    public MessageResponse createInvite(CreateSignoffInviteRequest request, UUID actorId) {
        String ufCode = request.ufCode().trim();
        if (!UfValidationService.DIRECTOR_GATED_UFS.contains(ufCode)) {
            throw new ApiException("Seules les unités UF 5 (Stage) et UF 11 (Soutenance) nécessitent une validation.");
        }
        User learner = userRepository.findById(request.learnerId())
                .orElseThrow(() -> new NotFoundException("Apprenant introuvable."));
        if (learner.getRole() != Role.ETUDIANT) {
            throw new ApiException("Validation réservée aux apprenants.");
        }

        LearnerUfValidation ufValidation = ufValidationRepository.findByLearnerIdAndUfCode(learner.getId(), ufCode)
                .orElseGet(() -> ufValidationRepository.save(LearnerUfValidation.builder()
                        .learner(learner)
                        .ufCode(ufCode)
                        .build()));

        String token = UUID.randomUUID().toString() + UUID.randomUUID().toString().replace("-", "");
        StageSignoffInvite invite = StageSignoffInvite.builder()
                .ufValidation(ufValidation)
                .token(token)
                .tutorEmail(request.tutorEmail().trim().toLowerCase())
                .tutorName(request.tutorName() != null && !request.tutorName().isBlank()
                        ? request.tutorName().trim() : null)
                .createdBy(actorId != null ? userRepository.getReferenceById(actorId) : null)
                .expiresAt(Instant.now().plus(INVITE_TTL))
                .build();
        inviteRepository.save(invite);

        sendInviteEmail(invite, learner);
        return new MessageResponse("Invitation envoyée à " + invite.getTutorEmail() + ".");
    }

    @Transactional(readOnly = true)
    public SignoffInviteView getInviteView(String token) {
        StageSignoffInvite invite = requireValidInvite(token);
        LearnerUfValidation uf = invite.getUfValidation();
        return new SignoffInviteView(
                uf.getLearner().getFullName() != null ? uf.getLearner().getFullName() : uf.getLearner().getEmail(),
                uf.getUfCode(),
                uf.isValidated(),
                invite.getExpiresAt()
        );
    }

    @Transactional
    public MessageResponse signOff(String token, SignOffRequest request) {
        StageSignoffInvite invite = requireValidInvite(token);
        LearnerUfValidation uf = invite.getUfValidation();
        boolean wasValidated = uf.isValidated();

        String tutorLabel = invite.getTutorName() != null ? invite.getTutorName() : invite.getTutorEmail();
        String noteText = "Validé par le tuteur externe (" + tutorLabel + ")"
                + (request.note() != null && !request.note().isBlank() ? " — " + request.note().trim() : "");
        uf.setValidated(true);
        uf.setValidatedAt(Instant.now());
        uf.setValidatedBy(null);
        uf.setNote(noteText);
        ufValidationRepository.save(uf);

        invite.setUsedAt(Instant.now());
        inviteRepository.save(invite);

        if (!wasValidated) {
            User learner = uf.getLearner();
            notificationService.notify(learner, NotificationType.UF_VALIDATED,
                    "Unité validée",
                    "Votre unité \"" + uf.getUfCode() + "\" a été validée par votre tuteur de stage.",
                    "/app/stage");
            if ("UF 5".equals(uf.getUfCode())) {
                badgeService.awardIfAbsent(learner, BadgeCode.STAGE_VALIDATED);
            }
            progressionService.checkAndAwardYearBadges(learner.getId());
        }

        return new MessageResponse("Validation enregistrée. Merci !");
    }

    private StageSignoffInvite requireValidInvite(String token) {
        StageSignoffInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new NotFoundException("Invitation introuvable."));
        if (invite.getUsedAt() != null) {
            throw new GoneException("Cette invitation a déjà été utilisée.");
        }
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            throw new GoneException("Cette invitation a expiré.");
        }
        return invite;
    }

    private void sendInviteEmail(StageSignoffInvite invite, User learner) {
        String link = emailProperties.getFrontendBaseUrl() + "/tutor-signoff/" + invite.getToken();
        String learnerName = learner.getFullName() != null ? learner.getFullName() : learner.getEmail();
        String greeting = invite.getTutorName() != null ? " " + escapeHtml(invite.getTutorName()) : "";
        String body = "<p>Bonjour" + greeting + ",</p>"
                + "<p>" + escapeHtml(appPlatformProperties.getName()) + " vous invite à valider le stage de "
                + escapeHtml(learnerName) + " (" + escapeHtml(invite.getUfValidation().getUfCode()) + ").</p>"
                + "<p><a href=\"" + link + "\">Accéder à la validation</a></p>"
                + "<p>Ce lien est valable 7 jours et à usage unique.</p>";
        emailService.send(invite.getTutorEmail(), "Validation de stage — " + appPlatformProperties.getName(), body);
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
