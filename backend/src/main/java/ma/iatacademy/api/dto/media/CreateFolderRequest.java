package ma.iatacademy.api.dto.media;

import java.util.UUID;

/** parentId null = create at the root level. */
public record CreateFolderRequest(String name, UUID parentId) {
}
