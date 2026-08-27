package ma.iatacademy.api.dto.gradebook;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** The learner's own report card — every module they have at least one graded
 * quiz/assignment in, each evaluation's score, and an overall average. */
public record LearnerBulletinResponse(
        String studentName,
        BigDecimal overallAverage,
        List<ModuleBulletin> modules
) {
    public record ModuleBulletin(
            UUID moduleId,
            String moduleTitle,
            List<EvaluationScore> evaluations,
            BigDecimal bonus,
            BigDecimal average
    ) {
    }

    public record EvaluationScore(
            UUID id,
            String label,
            String type,
            BigDecimal score,
            BigDecimal maxScore,
            Integer passingScore,
            Boolean passed
    ) {
    }
}
