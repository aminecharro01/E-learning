package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.UUID;

/** Exactly one of lessonId/rawText should be supplied — lessonId pulls the lesson's TEXT
 * blocks as source content, rawText is used verbatim otherwise. See QuestionGenerationService. */
public record AiGenerationRequest(
        UUID lessonId,
        String rawText,
        @NotNull QuestionType questionType,
        @Min(1) @Max(10) int count
) {
}
