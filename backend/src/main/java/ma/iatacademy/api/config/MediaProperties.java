package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.media")
public class MediaProperties {
    private String rootPath = "../data/media";
    private long signedUrlTtlSeconds = 3600;
    /** HMAC secret for signed media links (fallback to JWT secret if empty). */
    private String signingSecret = "";
    /** Per-kind upload caps — narrower than the global spring.servlet.multipart.max-file-size,
     *  which only stops absurd requests, not a 150 Mo "image" eating VPS disk. */
    private long maxImageSizeBytes = 5L * 1024 * 1024;
    private long maxDocumentSizeBytes = 15L * 1024 * 1024;
    private long maxVideoSizeBytes = 200L * 1024 * 1024;
}
