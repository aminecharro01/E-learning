package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateQuestionBankRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 2000) String description
) {
}
