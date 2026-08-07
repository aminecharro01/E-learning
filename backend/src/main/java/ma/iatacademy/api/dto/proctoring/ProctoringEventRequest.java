package ma.iatacademy.api.dto.proctoring;

import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.ProctoringEventType;

import java.util.Map;

public record ProctoringEventRequest(
        @NotNull ProctoringEventType eventType,
        Map<String, Object> meta
) {
}
