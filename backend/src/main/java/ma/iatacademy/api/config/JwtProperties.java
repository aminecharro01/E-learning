package ma.iatacademy.api.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    private static final int MIN_SECRET_LENGTH = 32; // 256 bits, minimum for HS256

    private String secret;
    private long expirationMs;
    private String cookieName;
    /** Set true behind HTTPS in production. */
    private boolean cookieSecure = false;

    @PostConstruct
    void validate() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET env var) is not set. Refusing to start with no signing secret.");
        }
        if (secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET env var) must be at least " + MIN_SECRET_LENGTH
                            + " bytes long for HS256.");
        }
    }
}
