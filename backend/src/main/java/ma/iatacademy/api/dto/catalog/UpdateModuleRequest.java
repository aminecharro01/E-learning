package ma.iatacademy.api.dto.catalog;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateModuleRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @NotNull Integer orderIndex,
        Boolean published,
        @Min(1) @Max(2) Integer yearNumber,
        @Size(max = 20) String ufCode,
        @Size(max = 255) String ufTitle
) {
}
