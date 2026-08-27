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
    /** Date de rentrée année 2 (ISO yyyy-MM-dd). Null = pas d'ouverture auto. */
    private String year2OpeningDate;
    /** Fenêtre annuelle stage & soutenance (ISO yyyy-MM-dd). Null = pas de restriction. */
    private String stageStartDate;
    private String stageEndDate;
    /** Palette prédéfinie appliquée à l'appli authentifiée (admin + espace apprenant). */
    private String themeVariant = "navy-gold";
}
