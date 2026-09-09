package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.dto.badge.BadgeResponse;
import ma.iatacademy.api.dto.badge.LevelResponse;
import ma.iatacademy.api.dto.badge.PublicBadgeResponse;
import ma.iatacademy.api.exception.NotFoundException;
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
                .shareCode(generateShareCode())
                .build());
        notificationService.notify(user, NotificationType.BADGE_EARNED,
                "Badge débloqué : " + code.getLabel(), code.getDescription(), "/app/profile");
    }

    /** Même format que Certificate.verificationCode — un UUID tronqué suffit, la
     *  contrainte unique en base rattrape la collision improbable. */
    private String generateShareCode() {
        return java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    @Transactional(readOnly = true)
    public List<BadgeResponse> listForUser(UUID userId) {
        Map<BadgeCode, UserBadge> earned = userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId).stream()
                .collect(java.util.stream.Collectors.toMap(UserBadge::getBadgeCode, ub -> ub));
        return java.util.Arrays.stream(BadgeCode.values())
                .map(code -> {
                    UserBadge ub = earned.get(code);
                    return new BadgeResponse(
                            code.name(),
                            code.getLabel(),
                            code.getDescription(),
                            code.getIcon(),
                            ub != null,
                            ub != null ? ub.getAwardedAt() : null,
                            ub != null ? ub.getShareCode() : null
                    );
                })
                .toList();
    }

    /** Initialise le proxy User avant de renvoyer l'entité : PublicBadgeController#image
     *  y accède après la fin de cette transaction (open-in-view désactivé, voir
     *  application.yml), donc un accès paresseux non résolu ici y lèverait
     *  LazyInitializationException. */
    @Transactional(readOnly = true)
    public UserBadge getByShareCode(String shareCode) {
        UserBadge userBadge = userBadgeRepository.findByShareCode(shareCode)
                .orElseThrow(() -> new NotFoundException("Code de badge invalide."));
        org.hibernate.Hibernate.initialize(userBadge.getUser());
        return userBadge;
    }

    @Transactional(readOnly = true)
    public PublicBadgeResponse getPublicBadge(String shareCode) {
        UserBadge ub = getByShareCode(shareCode);
        BadgeCode code = ub.getBadgeCode();
        User learner = ub.getUser();
        return new PublicBadgeResponse(
                ub.getShareCode(),
                code.name(),
                code.getLabel(),
                code.getDescription(),
                code.getIcon(),
                learner.getFullName() != null ? learner.getFullName() : learner.getEmail(),
                ub.getAwardedAt()
        );
    }

    /** Niveau dérivé du nombre de badges obtenus — pas de source de vérité supplémentaire à synchroniser. */
    @Transactional(readOnly = true)
    public LevelResponse level(UUID userId) {
        int earned = userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId).size();
        return new LevelResponse(earned, earned, BadgeCode.values().length);
    }
}
