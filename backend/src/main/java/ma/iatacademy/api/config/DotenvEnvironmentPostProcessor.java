package ma.iatacademy.api.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads the root .env file into the Spring Environment before context refresh, so
 * BUNNY_STREAM_ENABLED and friends reach the JVM regardless of which shell (or IDE
 * run configuration) started the app — `source .env` is bash-only and silently does
 * nothing under PowerShell, which is how this app kept falling back to local-disk
 * video storage despite .env having the right values (see BunnyStreamProperties).
 * Registered via META-INF/spring.factories since this must run before any @Bean.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        // Covers `mvnw spring-boot:run` from backend/ (the documented workflow) and
        // from the repo root, plus a packaged jar run from either location.
        for (String candidate : List.of(".env", "../.env")) {
            Path path = Path.of(candidate).toAbsolutePath().normalize();
            if (Files.isRegularFile(path)) {
                Map<String, Object> values = parse(path);
                if (!values.isEmpty()) {
                    environment.getPropertySources().addLast(new MapPropertySource("dotenv", values));
                    System.out.println("[dotenv] loaded " + values.size() + " variable(s) from " + path);
                }
                return;
            }
        }
    }

    private Map<String, Object> parse(Path path) {
        Map<String, Object> values = new LinkedHashMap<>();
        try {
            for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                int eq = trimmed.indexOf('=');
                if (eq <= 0) continue;
                String key = trimmed.substring(0, eq).trim();
                String value = trimmed.substring(eq + 1).trim();
                if (value.length() >= 2 && (value.charAt(0) == '"' || value.charAt(0) == '\'')
                        && value.charAt(value.length() - 1) == value.charAt(0)) {
                    value = value.substring(1, value.length() - 1);
                }
                values.put(key, value);
            }
        } catch (IOException e) {
            System.out.println("[dotenv] failed to read " + path + ": " + e.getMessage());
        }
        return values;
    }
}
