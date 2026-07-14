package ma.iatacademy.api.dto.quiz;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.List;

public record CreateQuestionRequest(
        @NotBlank String prompt,
        @NotNull QuestionType questionType,
        @NotNull Integer orderIndex,
        String explanation,
        @NotEmpty List<CreateOptionRequest> options
) {
}
