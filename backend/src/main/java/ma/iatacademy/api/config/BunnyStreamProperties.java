package ma.iatacademy.api.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Off by default (enabled=false) so a fresh checkout keeps uploading video to local
 * disk via MediaService until this is deliberately configured — see MediaService for
 * the branch point.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.bunny")
public class BunnyStreamProperties {
    private static final Logger log = LoggerFactory.getLogger(BunnyStreamProperties.class);

    private boolean enabled = false;
    private String libraryId = "";
    private String apiKey = "";
    /** Per-library CDN hostname shown in the Bunny dashboard, e.g. "vz-xxxxxxxx-abc.b-cdn.net". */
    private String pullZoneHostname = "";
    /**
     * Pull zone "Token Authentication Key" (Stream Library → Security tab). When blank,
     * thumbnail/CDN URLs are built unsigned — fine only if the pull zone has Token
     * Authentication disabled. When Token Authentication is on (the default for a
     * freshly-created Stream library), an unsigned URL 403s, so this must be set.
     */
    private String tokenAuthKey = "";

    /**
     * Tolerates the pull zone being pasted as a full URL ("https://vz-xxx.b-cdn.net/")
     * instead of a bare hostname — a very easy copy-paste mistake from the dashboard —
     * by stripping the scheme and any trailing slash before it's ever used to build a URL.
     */
    public String getPullZoneHostname() {
        return pullZoneHostname
                .replaceFirst("^https?://", "")
                .replaceAll("/+$", "");
    }

    // Logged once at boot so a misconfigured env var (e.g. BUNNY_STREAM_ENABLED never
    // actually reaching the JVM because nothing sources the root .env file) is visible
    // in the startup logs instead of silently falling back to local-disk video storage.
    @PostConstruct
    void logConfigOnStartup() {
        if (!enabled) {
            log.info("Bunny Stream: disabled (app.bunny.enabled=false) — video uploads go to local disk.");
            return;
        }
        boolean missing = libraryId.isBlank() || apiKey.isBlank() || pullZoneHostname.isBlank();
        log.info(
                "Bunny Stream: enabled=true, libraryId={}, pullZoneHostname={}, apiKey={}{}",
                libraryId.isBlank() ? "(vide)" : libraryId,
                getPullZoneHostname().isBlank() ? "(vide)" : getPullZoneHostname(),
                apiKey.isBlank() ? "(vide)" : "***" + apiKey.substring(Math.max(0, apiKey.length() - 4)),
                missing ? " — ATTENTION: un champ requis est vide, l'envoi vers Bunny va échouer." : ""
        );
    }
}
