package ma.iatacademy.api.dto.progress;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateLessonProgressRequest(
        @NotNull @Min(0) @Max(100) Integer videoWatchedPercent
) {
}
