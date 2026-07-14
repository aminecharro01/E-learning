package ma.iatacademy.api.dto.catalog;

import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;

import java.util.UUID;

public record ModuleSummaryResponse(
        UUID id,
        String title,
        String description,
        int orderIndex,
        boolean published,
        ModuleLearnerStatus learnerStatus
) {
}
