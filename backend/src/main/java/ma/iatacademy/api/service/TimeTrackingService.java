package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.TimeTrackingLog;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.TimeTrackingLogRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Le client envoie un heartbeat toutes les ~15s pendant la lecture d'une leçon/vidéo.
 * On incrémente un compteur Redis (même pattern que RateLimitService) au lieu d'écrire
 * une ligne SQL par heartbeat — un flush horaire agrège en une seule ligne par
 * (utilisateur, leçon, jour).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimeTrackingService {

    private static final String KEY_PREFIX = "time:";
    private static final Duration COUNTER_TTL = Duration.ofHours(48);

    private final StringRedisTemplate redisTemplate;
    private final LessonRepository lessonRepository;
    private final TimeTrackingLogRepository timeTrackingLogRepository;
    private final UserRepository userRepository;

    public void recordHeartbeat(UUID userId, UUID lessonId, int deltaSeconds) {
        if (deltaSeconds <= 0 || deltaSeconds > 120) {
            return; // borne large pour ignorer un delta aberrant (onglet resté ouvert des heures)
        }
        String key = key(userId, lessonId, LocalDate.now());
        Long total = redisTemplate.opsForValue().increment(key, deltaSeconds);
        if (total != null && total == deltaSeconds) {
            redisTemplate.expire(key, COUNTER_TTL);
        }
    }

    /** Toutes les heures : vide les compteurs Redis vers time_tracking_logs. */
    @Scheduled(fixedRate = 3_600_000)
    @Transactional
    public void flush() {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return;
        }
        for (String key : keys) {
            try {
                flushOne(key);
            } catch (Exception e) {
                log.warn("Échec flush time-tracking pour la clé {}", key, e);
            }
        }
    }

    private void flushOne(String key) {
        String[] parts = key.substring(KEY_PREFIX.length()).split(":");
        if (parts.length != 3) {
            redisTemplate.delete(key);
            return;
        }
        UUID userId = UUID.fromString(parts[0]);
        UUID lessonId = UUID.fromString(parts[1]);
        LocalDate date = LocalDate.parse(parts[2]);
        String rawValue = redisTemplate.opsForValue().get(key);
        int seconds = rawValue != null ? Integer.parseInt(rawValue) : 0;
        redisTemplate.delete(key);
        if (seconds <= 0) {
            return;
        }

        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        if (lesson == null || user == null) {
            return;
        }
        ModuleEntity module = lesson.getModule();

        TimeTrackingLog log = timeTrackingLogRepository.findByUserIdAndLessonIdAndEventDate(userId, lessonId, date)
                .orElseGet(() -> TimeTrackingLog.builder()
                        .user(user)
                        .lesson(lesson)
                        .module(module)
                        .eventDate(date)
                        .secondsSpent(0)
                        .build());
        log.setSecondsSpent(log.getSecondsSpent() + seconds);
        timeTrackingLogRepository.save(log);
    }

    private String key(UUID userId, UUID lessonId, LocalDate date) {
        return KEY_PREFIX + userId + ":" + lessonId + ":" + date;
    }
}
