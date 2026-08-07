package ma.iatacademy.api.dto.proctoring;

import ma.iatacademy.api.domain.enums.ProctoringEventType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ProctoringEventResponse(
        UUID id,
        ProctoringEventType eventType,
        Instant occurredAt,
        Map<String, Object> meta
) {
}
