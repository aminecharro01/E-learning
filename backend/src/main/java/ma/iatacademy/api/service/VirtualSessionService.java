package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.VirtualSession;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.dto.session.CreateVirtualSessionRequest;
import ma.iatacademy.api.dto.session.VirtualSessionResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.repository.LearnerGroupRepository;
import ma.iatacademy.api.repository.VirtualSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VirtualSessionService {

    private final VirtualSessionRepository sessionRepository;
    private final LearnerGroupRepository groupRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public VirtualSessionResponse create(CreateVirtualSessionRequest request, UUID actorId) {
        VirtualSession session = VirtualSession.builder()
                .module(request.moduleId() != null ? moduleRepository.getReferenceById(request.moduleId()) : null)
                .group(groupRepository.getReferenceById(request.groupId()))
                .title(request.title().trim())
                .provider(request.provider())
                .joinUrl(request.joinUrl().trim())
                .scheduledAt(request.scheduledAt())
                .durationMinutes(request.durationMinutes() != null ? request.durationMinutes() : 60)
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        sessionRepository.save(session);
        return toResponse(session);
    }

    @Transactional(readOnly = true)
    public List<VirtualSessionResponse> listByGroup(UUID groupId) {
        return sessionRepository.findByGroupIdOrderByScheduledAtAsc(groupId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(UUID sessionId) {
        sessionRepository.delete(sessionRepository.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("Session introuvable.")));
    }

    /** Toutes les 15 min : notifie les membres de la cohorte pour les sessions dans l'heure. */
    @Scheduled(fixedRate = 900_000)
    @Transactional
    public void sendReminders() {
        Instant now = Instant.now();
        List<VirtualSession> due = sessionRepository.findByReminderSentFalseAndScheduledAtBetween(now, now.plus(Duration.ofHours(1)));
        for (VirtualSession session : due) {
            if (session.getGroup() == null) continue;
            List<User> members = userRepository.findByGroupIdOrderByFullNameAsc(session.getGroup().getId());
            for (User member : members) {
                notificationService.notify(member, NotificationType.SESSION_REMINDER,
                        "Session live bientôt",
                        "\"" + session.getTitle() + "\" débute à " + session.getScheduledAt() + ".",
                        "/app", true);
            }
            session.setReminderSent(true);
            sessionRepository.save(session);
            log.info("Rappel envoyé pour la session {} ({} destinataire(s))", session.getId(), members.size());
        }
    }

    private VirtualSessionResponse toResponse(VirtualSession s) {
        return new VirtualSessionResponse(
                s.getId(),
                s.getModule() != null ? s.getModule().getId() : null,
                s.getGroup().getId(), s.getGroup().getName(),
                s.getTitle(), s.getProvider(), s.getJoinUrl(), s.getScheduledAt(), s.getDurationMinutes());
    }
}
