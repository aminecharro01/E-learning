package ma.iatacademy.api.dto.stage;

import java.util.List;
import java.util.UUID;

public record LearnerDossierResponse(
        UUID learnerId,
        String learnerName,
        String learnerEmail,
        boolean stageComplete,
        boolean soutenanceComplete,
        List<SlotStatus> slots,
        List<LearnerDocumentResponse> documents
) {
    public record SlotStatus(
            String docType,
            String label,
            String owner, // DIRECTOR | LEARNER
            String section, // STAGE | SOUTENANCE
            boolean required,
            boolean filled,
            UUID latestDocumentId
    ) {
    }
}
