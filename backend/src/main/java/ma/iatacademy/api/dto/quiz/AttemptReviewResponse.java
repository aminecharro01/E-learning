package ma.iatacademy.api.dto.quiz;

import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Per-question breakdown of a finished attempt — the learner's own selection vs the
 * correct answer, so the UI can highlight each option green/red. ESSAY questions carry no
 * selectable options; {@code correct} is null until a grader scores them (see essayScore). */
public record AttemptReviewResponse(
        UUID attemptId,
        BigDecimal score,
        int passingScore,
        AttemptStatus status,
        List<QuestionReview> questions
) {
    public record QuestionReview(
            UUID questionId,
            String prompt,
            QuestionType questionType,
            List<OptionReview> options,
            String freeTextAnswer,
            Boolean correct,
            BigDecimal essayScore,
            String essayFeedback,
            String explanation
    ) {
    }

    public record OptionReview(UUID optionId, String label, boolean correct, boolean selected) {
    }
}
