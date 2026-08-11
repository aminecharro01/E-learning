package ma.iatacademy.api.dto.media;

import java.util.UUID;

/** folderId null = move the asset to the root/unfiled level. */
public record MoveAssetRequest(UUID folderId) {
}
