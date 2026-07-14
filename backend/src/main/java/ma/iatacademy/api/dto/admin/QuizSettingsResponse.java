package ma.iatacademy.api.dto.admin;

public record QuizSettingsResponse(
        int defaultSectionPassingScore,
        int defaultModulePassingScore,
        int defaultModuleMaxAttempts,
        int defaultModuleTimeLimitSeconds,
        int defaultRetryDelayHours,
        int sectionCompletionVideoPercent
) {
}
