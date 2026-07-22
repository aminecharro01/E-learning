package ma.iatacademy.api.dto.stage;

import ma.iatacademy.api.domain.enums.LearnerDocStatus;
import ma.iatacademy.api.domain.enums.LearnerDocType;

import java.time.Instant;
import java.util.UUID;

public record LearnerDocumentResponse(
        UUID id,
        UUID learnerId,
        LearnerDocType docType,
        LearnerDocStatus status,
        UUID assetId,
        String filename,
        String mimeType,
        String downloadUrl,
        String notes,
        UUID uploadedById,
        String uploadedByName,
        Instant createdAt
) {
}
