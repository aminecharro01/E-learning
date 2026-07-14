package ma.iatacademy.api.dto.catalog;

import java.util.UUID;

public record LessonSummaryResponse(
        UUID id,
        String title,
        int orderIndex,
        boolean published,
        boolean completed
) {
}
