package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.dto.badge.BadgeResponse;
import ma.iatacademy.api.dto.badge.LevelResponse;
import ma.iatacademy.api.repository.UserBadgeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BadgeService {

    private final UserBadgeRepository userBadgeRepository;
    private final NotificationService notificationService;

    /** Idempotent: safe to call from every progress-affecting mutation without duplicate awards. */
    @Transactional
    public void awardIfAbsent(User user, BadgeCode code) {
        if (userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), code)) {
            return;
        }
        userBadgeRepository.save(UserBadge.builder()
                .user(user)
                .badgeCode(code)
                .awardedAt(Instant.now())
                .build());
        notificationService.notify(user, NotificationType.BADGE_EARNED,
                "Badge débloqué : " + code.getLabel(), code.getDescription(), "/app/profile");
    }

    @Transactional(readOnly = true)
    public List<BadgeResponse> listForUser(UUID userId) {
        Map<BadgeCode, Instant> earned = userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId).stream()
                .collect(java.util.stream.Collectors.toMap(UserBadge::getBadgeCode, UserBadge::getAwardedAt));
        return java.util.Arrays.stream(BadgeCode.values())
                .map(code -> new BadgeResponse(
                        code.name(),
                        code.getLabel(),
                        code.getDescription(),
                        code.getIcon(),
                        earned.containsKey(code),
                        earned.get(code)
                ))
                .toList();
    }

    /** Niveau dérivé du nombre de badges obtenus — pas de source de vérité supplémentaire à synchroniser. */
    @Transactional(readOnly = true)
    public LevelResponse level(UUID userId) {
        int earned = userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId).size();
        return new LevelResponse(earned, earned, BadgeCode.values().length);
    }
}
