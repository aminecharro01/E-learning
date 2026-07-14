package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * answers: questionId (string) -> list of selected optionIds (string)
 */
public record QuizSubmitRequest(
        @NotNull UUID attemptId,
        @NotNull Map<String, List<String>> answers
) {
}
