package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.exception.RateLimitException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private static final int MAX_ATTEMPTS = 10;
    private static final Duration TTL = Duration.ofMinutes(15);

    private final StringRedisTemplate redisTemplate;

    public void checkLoginAllowed(String ip) {
        String key = "rate:login:" + ip;
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, TTL);
        }
        if (count != null && count > MAX_ATTEMPTS) {
            throw new RateLimitException("Trop de tentatives de connexion. Réessayez dans 15 minutes.");
        }
    }
}
