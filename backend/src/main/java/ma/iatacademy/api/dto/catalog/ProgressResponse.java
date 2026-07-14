package ma.iatacademy.api.dto.catalog;

import java.util.List;
import java.util.UUID;

public record ProgressResponse(
        UUID formationId,
        String formationTitle,
        double completionPercent,
        UUID currentModuleId,
        UUID resumeLessonId,
        String resumeModuleTitle,
        List<ModuleSummaryResponse> modules
) {
}
