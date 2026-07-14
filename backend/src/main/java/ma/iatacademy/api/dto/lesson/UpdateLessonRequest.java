package ma.iatacademy.api.dto.lesson;

import jakarta.validation.constraints.Size;

public record UpdateLessonRequest(
        @Size(max = 255) String title,
        Integer orderIndex,
        Boolean published
) {
}
