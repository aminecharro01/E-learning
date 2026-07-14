package ma.iatacademy.api.dto.lesson;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateLessonRequest(
        @NotBlank @Size(max = 255) String title,
        @NotNull Integer orderIndex,
        Boolean published
) {
}
