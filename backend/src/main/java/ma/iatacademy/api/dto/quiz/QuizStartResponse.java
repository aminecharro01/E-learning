package ma.iatacademy.api.dto.quiz;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizStartResponse(
        UUID attemptId,
        UUID quizId,
        String title,
        Instant startedAt,
        Instant expiresAt,
        int timeLimitSeconds,
        int passingScore,
        boolean preview,
        List<QuizQuestionPublic> questions
) {
}
