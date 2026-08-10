package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
    /** ownerId IS NULL : uniquement les médias partagés (contenu pédagogique), jamais les documents privés. */
    Page<Asset> findByAssetKindAndOwnerIdIsNullOrderByCreatedAtDesc(String assetKind, Pageable pageable);
}
