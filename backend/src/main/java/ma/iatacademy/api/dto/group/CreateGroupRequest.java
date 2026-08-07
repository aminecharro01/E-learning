package ma.iatacademy.api.dto.group;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ma.iatacademy.api.domain.enums.EnrollmentMode;

import java.time.LocalDate;

public record CreateGroupRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 30) String code,
        LocalDate startDate,
        LocalDate endDate,
        EnrollmentMode enrollmentMode
) {
}
