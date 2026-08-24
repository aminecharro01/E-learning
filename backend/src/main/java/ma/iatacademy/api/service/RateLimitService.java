package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.exception.RateLimitException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private static final int LOGIN_MAX_ATTEMPTS = 10;
    private static final Duration LOGIN_TTL = Duration.ofMinutes(15);

    private static final int REGISTER_MAX_ATTEMPTS = 5;
    private static final Duration REGISTER_TTL = Duration.ofHours(1);

    private static final int PASSWORD_RESET_MAX_ATTEMPTS = 5;
    private static final Duration PASSWORD_RESET_TTL = Duration.ofHours(1);

    private static final int RESEND_VERIFICATION_MAX_ATTEMPTS = 5;
    private static final Duration RESEND_VERIFICATION_TTL = Duration.ofHours(1);

    private static final int MESSAGE_MAX_ATTEMPTS = 30;
    private static final Duration MESSAGE_TTL = Duration.ofMinutes(1);

    private static final int ASSISTANT_MAX_ATTEMPTS = 20;
    private static final Duration ASSISTANT_TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redisTemplate;

    public void checkLoginAllowed(String ip) {
        check("rate:login:" + ip, LOGIN_MAX_ATTEMPTS, LOGIN_TTL,
                "Trop de tentatives de connexion. Réessayez dans 15 minutes.");
    }

    public void checkRegisterAllowed(String ip) {
        check("rate:register:" + ip, REGISTER_MAX_ATTEMPTS, REGISTER_TTL,
                "Trop de tentatives d'inscription. Réessayez plus tard.");
    }

    public void checkPasswordResetAllowed(String ip) {
        check("rate:password-reset:" + ip, PASSWORD_RESET_MAX_ATTEMPTS, PASSWORD_RESET_TTL,
                "Trop de demandes de réinitialisation. Réessayez plus tard.");
    }

    public void checkResendVerificationAllowed(String ip) {
        check("rate:resend-verification:" + ip, RESEND_VERIFICATION_MAX_ATTEMPTS, RESEND_VERIFICATION_TTL,
                "Trop de demandes. Réessayez plus tard.");
    }

    public void checkMessageAllowed(String userId) {
        check("rate:message:" + userId, MESSAGE_MAX_ATTEMPTS, MESSAGE_TTL,
                "Trop de messages envoyés. Ralentissez un peu.");
    }

    public void checkAssistantAllowed(String userId) {
        check("rate:assistant:" + userId, ASSISTANT_MAX_ATTEMPTS, ASSISTANT_TTL,
                "Trop de questions à l'assistant. Réessayez dans quelques minutes.");
    }

    private void check(String key, int maxAttempts, Duration ttl, String message) {
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, ttl);
        }
        if (count != null && count > maxAttempts) {
            throw new RateLimitException(message);
        }
    }
}
