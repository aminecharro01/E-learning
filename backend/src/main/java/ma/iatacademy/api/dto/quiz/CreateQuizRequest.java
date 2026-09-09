package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuizQuestionMode;
import ma.iatacademy.api.domain.enums.QuizType;

import java.util.UUID;

public record CreateQuizRequest(
        @NotBlank String title,
        @NotNull QuizType quizType,
        /** Fixé à la création, verrouille le type de question accepté pour tout le quiz. */
        @NotNull QuizQuestionMode questionMode,
        UUID lessonId,
        UUID moduleId,
        /** FIN_UF only. */
        String ufCode,
        /** FIN_ANNEE only (1 ou 2). */
        Integer yearNumber,
        Integer passingScore,
        Integer maxAttempts,
        Integer timeLimitSeconds,
        Boolean randomizeQuestions,
        Boolean randomizeOptions,
        Integer retryDelayMinutes,
        Boolean blocking,
        Boolean published,
        Boolean proctoringEnabled,
        Boolean focusLossDetection,
        Boolean copyProtection,
        Boolean lockdownMode
) {
}
