package ma.iatacademy.api.dto.stage;

import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.LearnerDocType;

import java.util.UUID;

public record UploadLearnerDocumentRequest(
        @NotNull LearnerDocType docType,
        @NotNull UUID assetId,
        String notes
) {
}
