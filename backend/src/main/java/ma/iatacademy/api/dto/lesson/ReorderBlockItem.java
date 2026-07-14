package ma.iatacademy.api.dto.lesson;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReorderBlockItem(
        @NotNull UUID id,
        @NotNull Integer orderIndex
) {
}
