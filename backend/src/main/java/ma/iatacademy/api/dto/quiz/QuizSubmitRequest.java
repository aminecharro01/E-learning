package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * answers: questionId -> selected optionIds (SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE).
 * freeTextAnswers: questionId -> texte libre (ESSAY).
 */
public record QuizSubmitRequest(
        @NotNull UUID attemptId,
        @NotNull Map<String, List<String>> answers,
        Map<String, String> freeTextAnswers,
        Map<String, Object> structuredAnswers
) {
}
