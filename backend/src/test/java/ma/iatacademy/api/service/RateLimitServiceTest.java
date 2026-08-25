package ma.iatacademy.api.service;

import ma.iatacademy.api.exception.RateLimitException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RateLimitServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        rateLimitService = new RateLimitService(redisTemplate);
    }

    @Test
    void firstAttemptSetsExpiry() {
        when(valueOperations.increment(anyString())).thenReturn(1L);

        assertDoesNotThrow(() -> rateLimitService.checkLoginAllowed("1.2.3.4"));

        verify(redisTemplate).expire(eq("rate:login:1.2.3.4"), any(Duration.class));
    }

    @Test
    void subsequentAttemptUnderLimitDoesNotResetExpiry() {
        when(valueOperations.increment(anyString())).thenReturn(5L);

        assertDoesNotThrow(() -> rateLimitService.checkLoginAllowed("1.2.3.4"));

        verify(redisTemplate, never()).expire(anyString(), any(Duration.class));
    }

    @Test
    void exceedingLoginLimitThrows() {
        when(valueOperations.increment(anyString())).thenReturn(11L);

        assertThrows(RateLimitException.class, () -> rateLimitService.checkLoginAllowed("1.2.3.4"));
    }

    @Test
    void exceedingMessageLimitThrowsWithDistinctKey() {
        when(valueOperations.increment("rate:message:user-1")).thenReturn(31L);

        assertThrows(RateLimitException.class, () -> rateLimitService.checkMessageAllowed("user-1"));
    }

    @Test
    void underLimitForRegisterDoesNotThrow() {
        when(valueOperations.increment(anyString())).thenReturn(4L);

        assertDoesNotThrow(() -> rateLimitService.checkRegisterAllowed("1.2.3.4"));
    }
}
