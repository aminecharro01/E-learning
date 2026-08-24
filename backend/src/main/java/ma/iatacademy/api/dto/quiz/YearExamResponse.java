package ma.iatacademy.api.dto.quiz;

import java.util.UUID;

/** unlocked = the rest of that year's content is done, so the learner may attempt it. */
public record YearExamResponse(UUID quizId, String title, boolean unlocked) {
}
