package ma.iatacademy.api.dto.catalog;

import ma.iatacademy.api.domain.enums.QuizType;

import java.util.UUID;

public record ModuleQuizItemResponse(
        UUID id,
        String title,
        QuizType quizType,
        UUID lessonId,
        UUID moduleId,
        boolean published
) {
}
