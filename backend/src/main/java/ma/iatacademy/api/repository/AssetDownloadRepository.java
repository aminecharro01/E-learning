package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.AssetDownload;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AssetDownloadRepository extends JpaRepository<AssetDownload, UUID> {

    boolean existsByUserIdAndAssetId(UUID userId, UUID assetId);
}
