package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.dto.media.MoveAssetRequest;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.MediaService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final MediaService mediaService;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR','ETUDIANT')")
    public ResponseEntity<AssetResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "kind", required = false) String kind,
            @RequestParam(value = "folderId", required = false) UUID folderId
    ) {
        return ResponseEntity.ok(mediaService.upload(file, kind, null, folderId));
    }

    /** Bibliothèque de médias partagés (contenu pédagogique uniquement, jamais de documents privés) — pour réutiliser un asset au lieu de le re-uploader. */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<PageResponse<AssetResponse>> list(
            @RequestParam(required = false) String kind,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(required = false) UUID folderId
    ) {
        return ResponseEntity.ok(mediaService.list(kind, page, size, folderId));
    }

    /** Media file manager only — permanently deletes the asset's physical storage too. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        mediaService.deleteAsset(id);
        return ResponseEntity.noContent().build();
    }

    /** Media file manager only — moves an asset between folders (folderId null = root). */
    @PatchMapping("/{id}/move")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AssetResponse> move(@PathVariable UUID id, @RequestBody MoveAssetRequest body) {
        return ResponseEntity.ok(mediaService.moveAsset(id, body.folderId()));
    }

    @GetMapping("/{id}/stream")
    public ResponseEntity<SignedStreamResponse> stream(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(mediaService.createSignedStream(id, principal));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(
            @PathVariable UUID id,
            @RequestParam long expires,
            @RequestParam String sig
    ) {
        Resource resource = mediaService.loadSignedFile(id, expires, sig);
        Asset asset = mediaService.getAsset(id);
        boolean renderInline = switch (asset.getAssetKind()) {
            case "IMAGE", "VIDEO", "PDF" -> true;
            default -> false;
        };
        String disposition = (renderInline ? "inline" : "attachment") + "; filename=\"" + sanitizeFilename(asset.getFilename()) + "\"";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition)
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(asset.getMimeType()))
                .body(resource);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) {
            return "file";
        }
        // Strip quotes/control characters so a crafted original filename can't break
        // out of the quoted Content-Disposition value or inject extra header params.
        String cleaned = filename.replaceAll("[\"\\r\\n]", "");
        return cleaned.isBlank() ? "file" : cleaned;
    }
}
