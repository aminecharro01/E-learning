package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.repository.AssetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Persists a lazily-backfilled PDF thumbnail path outside whatever transaction the caller
 * is in. MediaService.thumbnailUrl() is reached from read-only list/get transactions, and a
 * plain self-invoked @Transactional write there would be a no-op (Spring's proxy is bypassed
 * on self-invocation, and even if it weren't, the outer read-only tx would swallow the write).
 * A separate bean with REQUIRES_NEW guarantees the write actually commits.
 */
@Service
@RequiredArgsConstructor
class PdfThumbnailBackfillWriter {

    private final AssetRepository assetRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persist(UUID assetId, String thumbnailPath) {
        assetRepository.findById(assetId).ifPresent(asset -> {
            if (asset.getThumbnailPath() == null) {
                asset.setThumbnailPath(thumbnailPath);
                assetRepository.save(asset);
            }
        });
    }
}
