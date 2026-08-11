package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.MediaFolder;
import ma.iatacademy.api.dto.media.BreadcrumbEntry;
import ma.iatacademy.api.dto.media.DeleteFolderPreview;
import ma.iatacademy.api.dto.media.FolderResponse;
import ma.iatacademy.api.dto.media.MediaBrowseResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.MediaFolderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Folder CRUD + composite browse endpoint for the admin media file manager. Folder trees
 * here are small and admin-curated (not user-generated at scale), so descendant collection
 * is a plain iterative BFS over the repository rather than a native recursive SQL CTE —
 * keeps this in the same "JPA derived query" style as the rest of the codebase.
 */
@Service
@RequiredArgsConstructor
public class MediaFolderService {

    private final MediaFolderRepository mediaFolderRepository;
    private final AssetRepository assetRepository;
    private final MediaService mediaService;

    @Transactional
    public FolderResponse createFolder(String name, UUID parentId) {
        if (name == null || name.isBlank()) {
            throw new ApiException("Le nom du dossier est requis.");
        }
        if (parentId != null && !mediaFolderRepository.existsById(parentId)) {
            throw new NotFoundException("Dossier parent introuvable.");
        }
        MediaFolder folder = MediaFolder.builder().name(name.trim()).parentId(parentId).build();
        return toResponse(mediaFolderRepository.save(folder));
    }

    @Transactional
    public FolderResponse renameFolder(UUID id, String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException("Le nom du dossier est requis.");
        }
        MediaFolder folder = getFolder(id);
        folder.setName(name.trim());
        return toResponse(mediaFolderRepository.save(folder));
    }

    @Transactional(readOnly = true)
    public MediaBrowseResponse browse(UUID folderId, String kind, int page, int size) {
        FolderResponse currentFolder = folderId == null ? null : toResponse(getFolder(folderId));
        List<BreadcrumbEntry> breadcrumbs = buildBreadcrumbs(folderId);
        List<FolderResponse> childFolders = (folderId == null
                ? mediaFolderRepository.findByParentIdIsNullOrderByNameAsc()
                : mediaFolderRepository.findByParentIdOrderByNameAsc(folderId))
                .stream().map(this::toResponse).toList();
        var assets = (kind == null || kind.isBlank())
                ? mediaService.listAllKinds(page, size, folderId)
                : (folderId == null ? mediaService.listUnfiled(kind, page, size) : mediaService.list(kind, page, size, folderId));
        return new MediaBrowseResponse(currentFolder, breadcrumbs, childFolders, assets);
    }

    @Transactional(readOnly = true)
    public DeleteFolderPreview previewDelete(UUID folderId) {
        Set<UUID> descendantFolderIds = collectDescendantIds(folderId);
        int assetCount = descendantFolderIds.stream()
                .mapToInt(fid -> assetRepository.findByFolderId(fid).size())
                .sum();
        return new DeleteFolderPreview(descendantFolderIds.size(), assetCount);
    }

    /**
     * Recursive delete: every asset in every descendant folder is removed through
     * MediaService#deleteAsset first (so Bunny/local-disk cleanup actually happens — this
     * must never be a raw SQL cascade, which would only drop the DB row and leak the
     * physical file/video), then the root folder row is deleted and ON DELETE CASCADE
     * cleans up the now-empty descendant folder rows.
     */
    @Transactional
    public void deleteFolder(UUID folderId) {
        getFolder(folderId); // 404s early if the folder doesn't exist
        Set<UUID> descendantFolderIds = collectDescendantIds(folderId);
        for (UUID fid : descendantFolderIds) {
            for (Asset asset : assetRepository.findByFolderId(fid)) {
                mediaService.deleteAsset(asset.getId());
            }
        }
        mediaFolderRepository.deleteById(folderId);
    }

    private List<BreadcrumbEntry> buildBreadcrumbs(UUID folderId) {
        List<BreadcrumbEntry> trail = new ArrayList<>();
        UUID cursor = folderId;
        while (cursor != null) {
            MediaFolder folder = getFolder(cursor);
            trail.add(new BreadcrumbEntry(folder.getId(), folder.getName()));
            cursor = folder.getParentId();
        }
        java.util.Collections.reverse(trail);
        return trail;
    }

    private Set<UUID> collectDescendantIds(UUID rootId) {
        Set<UUID> result = new LinkedHashSet<>();
        Deque<UUID> queue = new ArrayDeque<>(List.of(rootId));
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            if (!result.add(current)) continue;
            mediaFolderRepository.findByParentIdOrderByNameAsc(current).forEach(f -> queue.add(f.getId()));
        }
        return result;
    }

    private MediaFolder getFolder(UUID id) {
        return mediaFolderRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Dossier introuvable."));
    }

    private FolderResponse toResponse(MediaFolder folder) {
        return new FolderResponse(folder.getId(), folder.getName(), folder.getParentId());
    }
}
