package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.quiz")
public class QuizProperties {
    /** TODO: à valider avec le client */
    private int defaultSectionPassingScore = 50;
    private int defaultModulePassingScore = 60;
    private int defaultModuleMaxAttempts = 2;
    private int defaultModuleTimeLimitSeconds = 5400;
    private int defaultRetryDelayHours = 24;
    private int sectionCompletionVideoPercent = 90;
}
