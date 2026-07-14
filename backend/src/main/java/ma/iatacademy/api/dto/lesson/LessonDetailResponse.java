package ma.iatacademy.api.dto.lesson;

import java.util.List;
import java.util.UUID;

public record LessonDetailResponse(
        UUID id,
        UUID moduleId,
        String title,
        int orderIndex,
        boolean published,
        List<BlockResponse> blocks
) {
}
