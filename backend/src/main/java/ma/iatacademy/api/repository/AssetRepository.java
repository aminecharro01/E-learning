package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
    /** Used by DemoDataSeeder to make demo file creation idempotent (no repository method
     *  existed to look up an asset by name before this). */
    Optional<Asset> findFirstByFilename(String filename);
    /** ownerId IS NULL : uniquement les médias partagés (contenu pédagogique), jamais les documents privés. */
    Page<Asset> findByAssetKindAndOwnerIdIsNullOrderByCreatedAtDesc(String assetKind, Pageable pageable);

    /** Same as above, additionally scoped to one media-manager folder. */
    Page<Asset> findByAssetKindAndOwnerIdIsNullAndFolderIdOrderByCreatedAtDesc(
            String assetKind, UUID folderId, Pageable pageable);

    /** Root-level (unfiled) browsing — explicit IS NULL overload rather than relying on
     *  Spring Data's null-parameter handling for the query above. */
    Page<Asset> findByAssetKindAndOwnerIdIsNullAndFolderIdIsNullOrderByCreatedAtDesc(
            String assetKind, Pageable pageable);

    /** Used by MediaFolderService's recursive folder delete to physically clean up every
     *  asset in a folder before the folder row itself is removed. */
    List<Asset> findByFolderId(UUID folderId);

    /** Kind-agnostic browsing for the media file manager's "all types" view — deliberately
     *  separate from the kind-filtered methods above, which default a blank/null kind to
     *  "IMAGE" (fine for the existing single-purpose image picker, wrong for a general
     *  file manager that must show every kind by default). */
    Page<Asset> findByOwnerIdIsNullAndFolderIdOrderByCreatedAtDesc(UUID folderId, Pageable pageable);

    Page<Asset> findByOwnerIdIsNullAndFolderIdIsNullOrderByCreatedAtDesc(Pageable pageable);
}
