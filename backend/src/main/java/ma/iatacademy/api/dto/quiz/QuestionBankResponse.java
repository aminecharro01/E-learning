package ma.iatacademy.api.dto.quiz;

import java.util.UUID;

public record QuestionBankResponse(
        UUID id,
        String name,
        String description,
        long questionCount
) {
}
