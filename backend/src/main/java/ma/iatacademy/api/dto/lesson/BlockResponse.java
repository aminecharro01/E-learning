package ma.iatacademy.api.dto.lesson;

import ma.iatacademy.api.domain.enums.BlockType;

import java.util.Map;
import java.util.UUID;

public record BlockResponse(
        UUID id,
        BlockType blockType,
        Map<String, Object> content,
        int orderIndex
) {
}
