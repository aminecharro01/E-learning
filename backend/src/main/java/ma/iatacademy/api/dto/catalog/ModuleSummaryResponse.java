package ma.iatacademy.api.dto.catalog;

import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;

import java.util.UUID;

public record ModuleSummaryResponse(
        UUID id,
        String code,
        String title,
        String description,
        int orderIndex,
        Integer yearNumber,
        String ufCode,
        String ufTitle,
        boolean published,
        ModuleLearnerStatus learnerStatus,
        int progressPercent
) {
}
