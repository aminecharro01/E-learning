package ma.iatacademy.api.dto.assistant;

import java.util.List;

public record AssistantAskResponse(String answer, List<AssistantSource> sources) {
}
