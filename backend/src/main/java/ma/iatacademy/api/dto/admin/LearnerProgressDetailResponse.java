package ma.iatacademy.api.dto.admin;

import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;

import java.util.List;
import java.util.UUID;

public record LearnerProgressDetailResponse(
        UUID userId,
        String email,
        String fullName,
        String formationTitle,
        double completionPercent,
        List<ModuleStatusItem> modules
) {
    public record LessonStatusItem(
            UUID lessonId,
            String title,
            int orderIndex,
            boolean published,
            boolean completed
    ) {
    }

    public record ModuleStatusItem(
            UUID moduleId,
            String title,
            int orderIndex,
            ModuleLearnerStatus status,
            List<LessonStatusItem> lessons
    ) {
    }
}
