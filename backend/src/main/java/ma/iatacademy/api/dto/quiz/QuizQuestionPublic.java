package ma.iatacademy.api.dto.quiz;

import java.util.List;
import java.util.UUID;

public record QuizQuestionPublic(
        UUID id,
        String prompt,
        String questionType,
        int orderIndex,
        List<QuizOptionPublic> options
) {
}
