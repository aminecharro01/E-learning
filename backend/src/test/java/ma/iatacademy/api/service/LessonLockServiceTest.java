package ma.iatacademy.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.dto.lesson.LessonLockResponse;
import ma.iatacademy.api.exception.LessonLockedException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LessonLockServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private UserRepository userRepository;

    private LessonLockService lessonLockService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lessonLockService = new LessonLockService(redisTemplate, lessonRepository, userRepository, new ObjectMapper());
    }

    @Test
    void acquireThrowsWhenLessonMissing() {
        UUID lessonId = UUID.randomUUID();
        when(lessonRepository.existsById(lessonId)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> lessonLockService.acquire(lessonId, UUID.randomUUID()));
    }

    @Test
    void acquireSucceedsWhenLessonFree() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(lessonRepository.existsById(lessonId)).thenReturn(true);
        when(valueOperations.get("lesson_lock:" + lessonId)).thenReturn(null);
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).fullName("Prof A").build()));

        LessonLockResponse response = lessonLockService.acquire(lessonId, userId);

        assertEquals(userId, response.lockedBy());
        verify(valueOperations, times(1)).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void acquireThrowsWhenLockedByAnotherUser() {
        UUID lessonId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        when(lessonRepository.existsById(lessonId)).thenReturn(true);
        String payload = String.format(
                "{\"userId\":\"%s\",\"lockedAt\":\"2026-01-01T00:00:00Z\",\"expiresAt\":\"2026-01-01T00:30:00Z\"}",
                ownerId);
        when(valueOperations.get("lesson_lock:" + lessonId)).thenReturn(payload);
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(User.builder().id(ownerId).fullName("Prof B").build()));

        assertThrows(LessonLockedException.class, () -> lessonLockService.acquire(lessonId, requesterId));
    }

    @Test
    void acquireSucceedsWhenLockAlreadyOwnedBySameUser() {
        UUID lessonId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(lessonRepository.existsById(lessonId)).thenReturn(true);
        String payload = String.format(
                "{\"userId\":\"%s\",\"lockedAt\":\"2026-01-01T00:00:00Z\",\"expiresAt\":\"2026-01-01T00:30:00Z\"}",
                userId);
        when(valueOperations.get("lesson_lock:" + lessonId)).thenReturn(payload);
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).fullName("Prof A").build()));

        LessonLockResponse response = lessonLockService.acquire(lessonId, userId);

        assertEquals(userId, response.lockedBy());
    }

    @Test
    void releaseOnlyDeletesWhenOwnedByCaller() {
        UUID lessonId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        String payload = String.format(
                "{\"userId\":\"%s\",\"lockedAt\":\"2026-01-01T00:00:00Z\",\"expiresAt\":\"2026-01-01T00:30:00Z\"}",
                ownerId);
        when(valueOperations.get("lesson_lock:" + lessonId)).thenReturn(payload);

        lessonLockService.release(lessonId, otherId);

        verify(redisTemplate, never()).delete("lesson_lock:" + lessonId);
    }

    @Test
    void forceReleaseAlwaysDeletes() {
        UUID lessonId = UUID.randomUUID();

        lessonLockService.forceRelease(lessonId);

        verify(redisTemplate, times(1)).delete("lesson_lock:" + lessonId);
    }
}
