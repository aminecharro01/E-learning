package ma.iatacademy.api.dto.quiz;

import java.util.UUID;

public record QuizOptionPublic(
        UUID id,
        String label,
        int orderIndex
) {
}
