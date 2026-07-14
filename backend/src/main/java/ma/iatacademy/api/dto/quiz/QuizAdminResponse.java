package ma.iatacademy.api.dto.quiz;

import ma.iatacademy.api.domain.enums.QuizType;

import java.util.UUID;

public record QuizAdminResponse(
        UUID id,
        String title,
        QuizType quizType,
        UUID lessonId,
        UUID moduleId,
        int passingScore,
        int maxAttempts,
        int timeLimitSeconds,
        boolean randomizeQuestions,
        boolean randomizeOptions,
        int retryDelayHours,
        boolean blocking,
        boolean published,
        int questionCount
) {
}
