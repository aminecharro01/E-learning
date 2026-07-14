package ma.iatacademy.api.dto.lesson;

import ma.iatacademy.api.domain.enums.BlockType;

import java.util.Map;

public record UpdateBlockRequest(
        BlockType blockType,
        Map<String, Object> content,
        Integer orderIndex
) {
}
