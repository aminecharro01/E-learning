package ma.iatacademy.api.dto.note;

import jakarta.validation.constraints.NotBlank;

public record LessonNoteRequest(@NotBlank String body) {
}
