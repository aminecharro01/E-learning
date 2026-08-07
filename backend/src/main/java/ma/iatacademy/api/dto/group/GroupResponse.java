package ma.iatacademy.api.dto.group;

import ma.iatacademy.api.domain.enums.EnrollmentMode;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GroupResponse(
        UUID id,
        String name,
        String code,
        LocalDate startDate,
        LocalDate endDate,
        EnrollmentMode enrollmentMode,
        long memberCount,
        Instant createdAt
) {
}
