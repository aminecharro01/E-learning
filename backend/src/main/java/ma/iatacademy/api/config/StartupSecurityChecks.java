package ma.iatacademy.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * app.jwt.cookie-secure and app.swagger.enabled both default to values that are safe for
 * local dev but unsafe in production (cookie sent over plain HTTP; full API schema public).
 * This doesn't refuse to start — the dev/demo workflow intentionally runs with both left at
 * their defaults — it only turns a silent misconfiguration ("forgot to set the env var in
 * prod") into a loud one.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StartupSecurityChecks {

    private final Environment environment;
    private final JwtProperties jwtProperties;

    @EventListener(ApplicationReadyEvent.class)
    void checkOnStartup() {
        if (isDevProfile()) {
            return;
        }
        if (!jwtProperties.isCookieSecure()) {
            log.warn("SECURITY WARNING: app.jwt.cookie-secure (JWT_COOKIE_SECURE) is false while running "
                    + "outside the 'dev' profile — the session cookie will be sent over plain HTTP. "
                    + "Set JWT_COOKIE_SECURE=true in production.");
        }
        if (environment.getProperty("app.swagger.enabled", Boolean.class, true)) {
            log.warn("SECURITY WARNING: app.swagger.enabled (SWAGGER_ENABLED) is true while running outside "
                    + "the 'dev' profile — the full API schema is public. Set SWAGGER_ENABLED=false in production.");
        }
    }

    private boolean isDevProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equalsIgnoreCase("dev")) {
                return true;
            }
        }
        return false;
    }
}
