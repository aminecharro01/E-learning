package ma.iatacademy.api.dto.assistant;

import java.util.UUID;

public record AssistantSource(UUID lessonId, String lessonTitle, String moduleTitle, String link) {
}
