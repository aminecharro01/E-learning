package ma.iatacademy.api.dto.media;

import java.util.UUID;

public record AssetResponse(
        UUID id,
        String filename,
        String mimeType,
        long sizeBytes,
        String assetKind,
        Integer durationSec,
        String streamPath
) {
}
