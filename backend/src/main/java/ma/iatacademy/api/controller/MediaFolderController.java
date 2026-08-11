package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.media.CreateFolderRequest;
import ma.iatacademy.api.dto.media.DeleteFolderPreview;
import ma.iatacademy.api.dto.media.FolderResponse;
import ma.iatacademy.api.dto.media.MediaBrowseResponse;
import ma.iatacademy.api.dto.media.RenameFolderRequest;
import ma.iatacademy.api.service.MediaFolderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/media-folders")
@RequiredArgsConstructor
public class MediaFolderController {

    private final MediaFolderService mediaFolderService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FolderResponse> create(@RequestBody CreateFolderRequest body) {
        return ResponseEntity.ok(mediaFolderService.createFolder(body.name(), body.parentId()));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FolderResponse> rename(@PathVariable UUID id, @RequestBody RenameFolderRequest body) {
        return ResponseEntity.ok(mediaFolderService.renameFolder(id, body.name()));
    }

    @GetMapping("/{id}/delete-preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DeleteFolderPreview> deletePreview(@PathVariable UUID id) {
        return ResponseEntity.ok(mediaFolderService.previewDelete(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        mediaFolderService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    /** Read-only browse — matches the same access level as the existing asset list endpoint. */
    @GetMapping("/browse")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MediaBrowseResponse> browse(
            @RequestParam(required = false) UUID folderId,
            @RequestParam(required = false) String kind,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        return ResponseEntity.ok(mediaFolderService.browse(folderId, kind, page, size));
    }
}
