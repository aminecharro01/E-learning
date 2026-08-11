package ma.iatacademy.api.dto.media;

import java.util.UUID;

public record FolderResponse(UUID id, String name, UUID parentId) {
}
