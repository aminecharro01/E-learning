package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Proxies allowed to set X-Forwarded-For. Empty by default: with no reverse proxy in
 * front of the API, X-Forwarded-For is fully attacker-controlled and must be ignored,
 * or a client can spoof a fresh IP on every request to dodge RateLimitService.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.security")
public class SecurityProperties {
    private List<String> trustedProxies = List.of();
}
