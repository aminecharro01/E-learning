package ma.iatacademy.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.lesson.LessonLockResponse;
import ma.iatacademy.api.exception.LessonLockedException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LessonLockService {

    private static final Duration LOCK_TTL = Duration.ofMinutes(30);

    private final StringRedisTemplate redisTemplate;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public LessonLockResponse acquire(UUID lessonId, UUID userId) {
        ensureLessonExists(lessonId);
        String key = key(lessonId);
        String existing = redisTemplate.opsForValue().get(key);

        if (existing != null) {
            LockPayload payload = read(existing);
            if (!payload.userId().equals(userId)) {
                String name = userRepository.findById(payload.userId())
                        .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .orElse("un autre formateur");
                throw new LessonLockedException(payload.userId(), name, payload.lockedAt(), payload.expiresAt());
            }
        }

        Instant lockedAt = Instant.now();
        Instant expiresAt = lockedAt.plus(LOCK_TTL);
        LockPayload payload = new LockPayload(userId, lockedAt, expiresAt);
        redisTemplate.opsForValue().set(key, write(payload), LOCK_TTL);

        String name = userRepository.findById(userId)
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                .orElse("Formateur");
        return new LessonLockResponse(lessonId, userId, name, lockedAt, expiresAt);
    }

    public LessonLockResponse renew(UUID lessonId, UUID userId) {
        ensureLessonExists(lessonId);
        String key = key(lessonId);
        String existing = redisTemplate.opsForValue().get(key);
        if (existing == null) {
            return acquire(lessonId, userId);
        }
        LockPayload payload = read(existing);
        if (!payload.userId().equals(userId)) {
            String name = userRepository.findById(payload.userId())
                    .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                    .orElse("un autre formateur");
            throw new LessonLockedException(payload.userId(), name, payload.lockedAt(), payload.expiresAt());
        }
        Instant expiresAt = Instant.now().plus(LOCK_TTL);
        LockPayload renewed = new LockPayload(userId, payload.lockedAt(), expiresAt);
        redisTemplate.opsForValue().set(key, write(renewed), LOCK_TTL);
        String name = userRepository.findById(userId)
                .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                .orElse("Formateur");
        return new LessonLockResponse(lessonId, userId, name, renewed.lockedAt(), expiresAt);
    }

    public void release(UUID lessonId, UUID userId) {
        String key = key(lessonId);
        String existing = redisTemplate.opsForValue().get(key);
        if (existing == null) {
            return;
        }
        LockPayload payload = read(existing);
        if (payload.userId().equals(userId)) {
            redisTemplate.delete(key);
        }
    }

    public void forceRelease(UUID lessonId) {
        redisTemplate.delete(key(lessonId));
    }

    public void assertOwnedBy(UUID lessonId, UUID userId) {
        String existing = redisTemplate.opsForValue().get(key(lessonId));
        if (existing == null) {
            // auto-acquire for edit ops if free
            acquire(lessonId, userId);
            return;
        }
        LockPayload payload = read(existing);
        if (!payload.userId().equals(userId)) {
            String name = userRepository.findById(payload.userId())
                    .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                    .orElse("un autre formateur");
            throw new LessonLockedException(payload.userId(), name, payload.lockedAt(), payload.expiresAt());
        }
    }

    private void ensureLessonExists(UUID lessonId) {
        if (!lessonRepository.existsById(lessonId)) {
            throw new NotFoundException("Leçon introuvable.");
        }
    }

    private String key(UUID lessonId) {
        return "lesson_lock:" + lessonId;
    }

    private String write(LockPayload payload) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "userId", payload.userId().toString(),
                    "lockedAt", payload.lockedAt().toString(),
                    "expiresAt", payload.expiresAt().toString()
            ));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize lesson lock", e);
        }
    }

    private LockPayload read(String json) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, String> map = objectMapper.readValue(json, Map.class);
            return new LockPayload(
                    UUID.fromString(map.get("userId")),
                    Instant.parse(map.get("lockedAt")),
                    Instant.parse(map.get("expiresAt"))
            );
        } catch (Exception e) {
            throw new IllegalStateException("Unable to read lesson lock", e);
        }
    }

    private record LockPayload(UUID userId, Instant lockedAt, Instant expiresAt) {
    }
}
