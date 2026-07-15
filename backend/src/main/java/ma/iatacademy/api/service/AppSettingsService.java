package ma.iatacademy.api.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.dto.admin.AppSettingsRequest;
import ma.iatacademy.api.dto.admin.AppSettingsResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppSettingsService {

    private static final String REDIS_KEY = "app:settings:platform";

    private final AppPlatformProperties properties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @PostConstruct
    void init() {
        loadFromRedisIfPresent();
    }

    public AppSettingsResponse get() {
        loadFromRedisIfPresent();
        return toResponse();
    }

    public AppSettingsResponse update(AppSettingsRequest request) {
        properties.setName(request.platformName().trim());
        properties.setSupportEmail(request.supportEmail() != null ? request.supportEmail().trim() : "");
        properties.setRegistrationEnabled(request.registrationEnabled());
        properties.setDefaultResetPassword(request.defaultResetPassword());
        persistToRedis();
        return toResponse();
    }

    public String getDefaultResetPassword() {
        loadFromRedisIfPresent();
        return properties.getDefaultResetPassword();
    }

    public boolean isRegistrationEnabled() {
        loadFromRedisIfPresent();
        return properties.isRegistrationEnabled();
    }

    private AppSettingsResponse toResponse() {
        return new AppSettingsResponse(
                properties.getName(),
                properties.getSupportEmail(),
                properties.isRegistrationEnabled(),
                properties.getDefaultResetPassword()
        );
    }

    private void persistToRedis() {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY, objectMapper.writeValueAsString(toResponse()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Impossible de persister les paramètres application.", e);
        }
    }

    private void loadFromRedisIfPresent() {
        String raw = redisTemplate.opsForValue().get(REDIS_KEY);
        if (raw == null || raw.isBlank()) {
            return;
        }
        try {
            AppSettingsResponse stored = objectMapper.readValue(raw, AppSettingsResponse.class);
            properties.setName(stored.platformName());
            properties.setSupportEmail(stored.supportEmail());
            properties.setRegistrationEnabled(stored.registrationEnabled());
            properties.setDefaultResetPassword(stored.defaultResetPassword());
        } catch (JsonProcessingException ignored) {
            // keep defaults
        }
    }
}
