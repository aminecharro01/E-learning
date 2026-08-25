package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.dto.badge.BadgeResponse;
import ma.iatacademy.api.dto.badge.LevelResponse;
import ma.iatacademy.api.repository.UserBadgeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    @Mock
    private UserBadgeRepository userBadgeRepository;
    @Mock
    private NotificationService notificationService;

    private BadgeService badgeService;

    private BadgeService newService() {
        return new BadgeService(userBadgeRepository, notificationService);
    }

    @Test
    void awardIfAbsentSkipsWhenAlreadyEarned() {
        badgeService = newService();
        User user = User.builder().id(UUID.randomUUID()).build();
        when(userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), BadgeCode.FIRST_MODULE)).thenReturn(true);

        badgeService.awardIfAbsent(user, BadgeCode.FIRST_MODULE);

        verify(userBadgeRepository, never()).save(any());
        verify(notificationService, never()).notify(any(), any(), any(), any(), any());
    }

    @Test
    void awardIfAbsentSavesAndNotifiesWhenNotEarned() {
        badgeService = newService();
        User user = User.builder().id(UUID.randomUUID()).build();
        when(userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), BadgeCode.FIRST_MODULE)).thenReturn(false);

        badgeService.awardIfAbsent(user, BadgeCode.FIRST_MODULE);

        verify(userBadgeRepository, times(1)).save(any(UserBadge.class));
        verify(notificationService, times(1)).notify(any(), any(), any(), any(), any());
    }

    @Test
    void listForUserMarksEarnedBadgesAndLeavesOthersUnearned() {
        badgeService = newService();
        UUID userId = UUID.randomUUID();
        UserBadge earned = UserBadge.builder()
                .badgeCode(BadgeCode.FIRST_MODULE)
                .awardedAt(Instant.now())
                .build();
        when(userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId)).thenReturn(List.of(earned));

        List<BadgeResponse> badges = badgeService.listForUser(userId);

        assertEquals(BadgeCode.values().length, badges.size());
        BadgeResponse firstModule = badges.stream()
                .filter(b -> b.code().equals(BadgeCode.FIRST_MODULE.name()))
                .findFirst().orElseThrow();
        assertTrue(firstModule.earned());
        long unearnedCount = badges.stream().filter(b -> !b.earned()).count();
        assertEquals(BadgeCode.values().length - 1, unearnedCount);
    }

    @Test
    void levelCountsEarnedBadges() {
        badgeService = newService();
        UUID userId = UUID.randomUUID();
        when(userBadgeRepository.findByUserIdOrderByAwardedAtDesc(userId))
                .thenReturn(List.of(
                        UserBadge.builder().badgeCode(BadgeCode.FIRST_MODULE).awardedAt(Instant.now()).build(),
                        UserBadge.builder().badgeCode(BadgeCode.PERFECT_QUIZ).awardedAt(Instant.now()).build()));

        LevelResponse level = badgeService.level(userId);

        assertEquals(2, level.level());
        assertFalse(level.totalBadges() == 0);
    }
}
