package ma.iatacademy.api.dto.note;

import java.time.Instant;
import java.util.UUID;

public record LessonNoteResponse(
        UUID id,
        String body,
        Instant createdAt,
        Instant updatedAt
) {
}
