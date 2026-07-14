package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuizType;

import java.util.UUID;

public record CreateQuizRequest(
        @NotBlank String title,
        @NotNull QuizType quizType,
        UUID lessonId,
        UUID moduleId,
        Integer passingScore,
        Integer maxAttempts,
        Integer timeLimitSeconds,
        Boolean randomizeQuestions,
        Boolean randomizeOptions,
        Integer retryDelayHours,
        Boolean blocking,
        Boolean published
) {
}
