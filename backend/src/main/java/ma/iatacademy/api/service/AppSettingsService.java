package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.dto.admin.AppSettingsRequest;
import ma.iatacademy.api.dto.admin.AppSettingsResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

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
        try {
            properties.setYear2OpeningDate(normalizeDate(request.year2OpeningDate()));
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Date de rentrée année 2 invalide (format AAAA-MM-JJ).");
        }
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

    /** True si une date de rentrée est définie et que la date du jour l'a atteinte. */
    public boolean isYear2OpeningDateReached() {
        loadFromRedisIfPresent();
        String raw = properties.getYear2OpeningDate();
        if (raw == null || raw.isBlank()) {
            return false;
        }
        try {
            LocalDate opening = LocalDate.parse(raw.trim());
            return !LocalDate.now().isBefore(opening);
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    public String getYear2OpeningDate() {
        loadFromRedisIfPresent();
        return properties.getYear2OpeningDate();
    }

    private static String normalizeDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        LocalDate.parse(trimmed); // validate
        return trimmed;
    }

    private AppSettingsResponse toResponse() {
        return new AppSettingsResponse(
                properties.getName(),
                properties.getSupportEmail(),
                properties.isRegistrationEnabled(),
                properties.getDefaultResetPassword(),
                properties.getYear2OpeningDate()
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
            if (stored.year2OpeningDate() != null) {
                properties.setYear2OpeningDate(stored.year2OpeningDate());
            }
        } catch (JsonProcessingException ignored) {
            // keep defaults
        }
    }
}
