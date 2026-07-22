package ma.iatacademy.api.dto.catalog;

import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;

import java.util.List;
import java.util.UUID;

public record ModuleDetailResponse(
        UUID id,
        UUID formationId,
        String code,
        String title,
        String description,
        int orderIndex,
        Integer yearNumber,
        String ufCode,
        String ufTitle,
        boolean published,
        ModuleLearnerStatus learnerStatus,
        List<LessonSummaryResponse> lessons,
        List<ModuleQuizItemResponse> quizzes
) {
}
