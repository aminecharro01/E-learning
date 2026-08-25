package ma.iatacademy.api.service;

import jakarta.annotation.PostConstruct;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.dto.admin.QuizSettingsRequest;
import ma.iatacademy.api.dto.admin.QuizSettingsResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QuizSettingsService {

    private static final String REDIS_KEY = "app:settings:quiz";

    private final QuizProperties quizProperties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @PostConstruct
    void init() {
        loadFromRedisIfPresent();
    }

    public QuizSettingsResponse get() {
        loadFromRedisIfPresent();
        return toResponse();
    }

    public QuizSettingsResponse update(QuizSettingsRequest request) {
        quizProperties.setDefaultSectionPassingScore(request.defaultSectionPassingScore());
        quizProperties.setDefaultModulePassingScore(request.defaultModulePassingScore());
        quizProperties.setDefaultModuleMaxAttempts(request.defaultModuleMaxAttempts());
        quizProperties.setDefaultModuleTimeLimitSeconds(request.defaultModuleTimeLimitSeconds());
        quizProperties.setDefaultRetryDelayMinutes(request.defaultRetryDelayMinutes());
        quizProperties.setSectionCompletionVideoPercent(request.sectionCompletionVideoPercent());
        persistToRedis();
        return toResponse();
    }

    private QuizSettingsResponse toResponse() {
        return new QuizSettingsResponse(
                quizProperties.getDefaultSectionPassingScore(),
                quizProperties.getDefaultModulePassingScore(),
                quizProperties.getDefaultModuleMaxAttempts(),
                quizProperties.getDefaultModuleTimeLimitSeconds(),
                quizProperties.getDefaultRetryDelayMinutes(),
                quizProperties.getSectionCompletionVideoPercent()
        );
    }

    private void persistToRedis() {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, objectMapper.writeValueAsString(toResponse()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Impossible de persister les paramètres quiz.", e);
        }
    }

    private void loadFromRedisIfPresent() {
        String raw = redisTemplate.opsForValue().get(REDIS_KEY);
        if (raw == null || raw.isBlank()) {
            return;
        }
        try {
            QuizSettingsResponse stored = objectMapper.readValue(raw, QuizSettingsResponse.class);
            quizProperties.setDefaultSectionPassingScore(stored.defaultSectionPassingScore());
            quizProperties.setDefaultModulePassingScore(stored.defaultModulePassingScore());
            quizProperties.setDefaultModuleMaxAttempts(stored.defaultModuleMaxAttempts());
            quizProperties.setDefaultModuleTimeLimitSeconds(stored.defaultModuleTimeLimitSeconds());
            quizProperties.setDefaultRetryDelayMinutes(stored.defaultRetryDelayMinutes());
            quizProperties.setSectionCompletionVideoPercent(stored.sectionCompletionVideoPercent());
        } catch (JsonProcessingException ignored) {
            // keep yml defaults
        }
    }
}
