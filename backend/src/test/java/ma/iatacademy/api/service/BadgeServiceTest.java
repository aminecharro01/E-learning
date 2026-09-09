package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.dto.badge.BadgeResponse;
import ma.iatacademy.api.dto.badge.LevelResponse;
import ma.iatacademy.api.dto.badge.PublicBadgeResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.UserBadgeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    void awardIfAbsentGeneratesAShareCode() {
        badgeService = newService();
        User user = User.builder().id(UUID.randomUUID()).build();
        when(userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), BadgeCode.FIRST_MODULE)).thenReturn(false);
        ArgumentCaptor<UserBadge> captor = ArgumentCaptor.forClass(UserBadge.class);

        badgeService.awardIfAbsent(user, BadgeCode.FIRST_MODULE);

        verify(userBadgeRepository).save(captor.capture());
        assertNotNull(captor.getValue().getShareCode());
        assertEquals(16, captor.getValue().getShareCode().length());
    }

    @Test
    void getPublicBadgeReturnsMappedDataForKnownShareCode() {
        badgeService = newService();
        User learner = User.builder().id(UUID.randomUUID()).fullName("Amina Benali").build();
        UserBadge badge = UserBadge.builder()
                .badgeCode(BadgeCode.STAGE_VALIDATED)
                .awardedAt(Instant.now())
                .shareCode("ABCD1234EFGH5678")
                .user(learner)
                .build();
        when(userBadgeRepository.findByShareCode("ABCD1234EFGH5678")).thenReturn(Optional.of(badge));

        PublicBadgeResponse response = badgeService.getPublicBadge("ABCD1234EFGH5678");

        assertEquals("STAGE_VALIDATED", response.badgeCode());
        assertEquals("Amina Benali", response.learnerName());
        assertEquals("ABCD1234EFGH5678", response.shareCode());
    }

    @Test
    void getPublicBadgeThrowsForUnknownShareCode() {
        badgeService = newService();
        when(userBadgeRepository.findByShareCode("UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> badgeService.getPublicBadge("UNKNOWN"));
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
