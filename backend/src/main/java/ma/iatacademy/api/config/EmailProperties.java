package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.mail")
public class EmailProperties {
    /** When false, EmailServiceImpl logs the message instead of sending via SMTP. */
    private boolean enabled = false;
    private String from;
    private String frontendBaseUrl;
}
