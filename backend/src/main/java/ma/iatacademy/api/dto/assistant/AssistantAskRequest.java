package ma.iatacademy.api.dto.assistant;

import jakarta.validation.constraints.NotBlank;

public record AssistantAskRequest(@NotBlank String question) {
}
