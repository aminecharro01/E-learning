package ma.iatacademy.api.dto.lesson;

import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.BlockType;

import java.util.Map;

public record CreateBlockRequest(
        @NotNull BlockType blockType,
        @NotNull Map<String, Object> content,
        @NotNull Integer orderIndex
) {
}
