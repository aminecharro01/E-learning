package ma.iatacademy.api.dto.quiz;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PendingReviewAttemptResponse(
        UUID attemptId,
        UUID quizId,
        String quizTitle,
        UUID userId,
        String userFullName,
        Instant submittedAt,
        List<EssayAnswerToGrade> essayAnswers
) {
    public record EssayAnswerToGrade(
            UUID questionId,
            String prompt,
            String submittedText,
            boolean graded,
            java.math.BigDecimal score,
            String feedback
    ) {
    }
}
