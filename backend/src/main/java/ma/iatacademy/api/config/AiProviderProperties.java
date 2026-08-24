package ma.iatacademy.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Gemini (primary) + Grok (fallback) for AI question generation — see
 * QuestionGenerationService. Off by default: a provider is "configured" only once its
 * api-key is non-blank, no separate enabled flag needed (unlike Bunny, there's no
 * destructive side-effect to gate here).
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiProviderProperties {

    private final Gemini gemini = new Gemini();
    private final Grok grok = new Grok();

    @Getter
    @Setter
    public static class Gemini {
        private String apiKey = "";
        private String model = "gemini-3.6-flash";

        public boolean isConfigured() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    @Getter
    @Setter
    public static class Grok {
        private String apiKey = "";
        private String model = "grok-2-latest";

        public boolean isConfigured() {
            return apiKey != null && !apiKey.isBlank();
        }
    }
}
