package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record QuizSettingsRequest(
        @NotNull @Min(0) @Max(100) Integer defaultSectionPassingScore,
        @NotNull @Min(0) @Max(100) Integer defaultModulePassingScore,
        @NotNull @Min(1) @Max(20) Integer defaultModuleMaxAttempts,
        @NotNull @Min(0) Integer defaultModuleTimeLimitSeconds,
        @NotNull @Min(0) @Max(10080) Integer defaultRetryDelayMinutes,
        @NotNull @Min(1) @Max(100) Integer sectionCompletionVideoPercent
) {
}
