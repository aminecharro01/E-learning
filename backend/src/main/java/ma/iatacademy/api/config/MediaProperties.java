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
}
