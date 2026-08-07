package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Notification;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.notification.NotificationListResponse;
import ma.iatacademy.api.dto.notification.NotificationResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    /** Fire-and-forget: called from existing mutation flows (quiz graded, module completed, UF validated). */
    @Transactional
    public void notify(User user, NotificationType type, String title, String message, String link) {
        notify(user, type, title, message, link, false);
    }

    /** Même chose, avec un envoi e-mail en plus (best-effort — un échec d'envoi n'annule pas la notification in-app). */
    @Transactional
    public void notify(User user, NotificationType type, String title, String message, String link, boolean alsoEmail) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .link(link)
                .build();
        notificationRepository.save(notification);
        if (alsoEmail && user.getEmail() != null && user.isEmailVerified()) {
            try {
                emailService.send(user.getEmail(), title, "<p>" + message + "</p>");
            } catch (Exception ignored) {
                // best-effort : la notification in-app reste enregistrée même si l'e-mail échoue
            }
        }
    }

    @Transactional(readOnly = true)
    public NotificationListResponse list(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<Notification> result = notificationRepository.findByUserIdUnreadFirst(userId, pageable);
        long unreadCount = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        return new NotificationListResponse(PageResponse.from(result.map(this::toResponse)), unreadCount);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Notification introuvable."));
        if (!notification.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Cette notification ne vous appartient pas.");
        }
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }
    }

    private NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getLink(),
                n.getReadAt() != null,
                n.getCreatedAt()
        );
    }
}
