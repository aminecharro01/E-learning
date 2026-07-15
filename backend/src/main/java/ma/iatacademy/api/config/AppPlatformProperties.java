package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.platform")
public class AppPlatformProperties {
    private String name = "IAT Academy";
    private String supportEmail = "support@iat-academy.local";
    private boolean registrationEnabled = true;
    private String defaultResetPassword = "IatReset@123";
}
