package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.dto.media.AssetResponse;
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
            @RequestParam(value = "kind", required = false) String kind
    ) {
        return ResponseEntity.ok(mediaService.upload(file, kind));
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
