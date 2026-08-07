package ma.iatacademy.api.dto.stage;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateSignoffInviteRequest(
        @NotNull UUID learnerId,
        @NotBlank String ufCode,
        @NotBlank @Email String tutorEmail,
        String tutorName
) {
}
