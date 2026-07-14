package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateOptionRequest(
        @NotBlank String label,
        @NotNull Boolean correct,
        @NotNull Integer orderIndex
) {
}
