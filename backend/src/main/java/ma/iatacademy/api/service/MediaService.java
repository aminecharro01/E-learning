package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.config.MediaProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {

    private static final Set<String> VIDEO_EXT = Set.of("mp4", "webm", "m3u8", "ts");
    private static final Set<String> PDF_EXT = Set.of("pdf");
    private static final Set<String> IMAGE_EXT = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Set<String> DOCUMENT_EXT = Set.of("pdf", "doc", "docx", "odt", "ods");
    private static final Set<String> SLIDE_EXT = Set.of("ppt", "pptx", "odp");

    // Allow-list of every extension we accept. Anything else is rejected outright —
    // never fall back to a default "DOCUMENT" kind for an unrecognized extension.
    private static final Set<String> ALLOWED_EXT = Set.of(
            "mp4", "webm", "m3u8", "ts",
            "pdf",
            "png", "jpg", "jpeg", "gif", "webp",
            "doc", "docx", "odt", "ods",
            "ppt", "pptx", "odp"
    );

    // Content-Type is derived from this map server-side and never trusted from the
    // client's multipart Content-Type header — that header is fully attacker-controlled
    // and previously let an uploader serve arbitrary HTML/SVG as "inline" (stored XSS).
    private static final Map<String, String> EXT_TO_MIME = Map.ofEntries(
            Map.entry("mp4", "video/mp4"),
            Map.entry("webm", "video/webm"),
            Map.entry("m3u8", "application/vnd.apple.mpegurl"),
            Map.entry("ts", "video/mp2t"),
            Map.entry("pdf", "application/pdf"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("odt", "application/vnd.oasis.opendocument.text"),
            Map.entry("ods", "application/vnd.oasis.opendocument.spreadsheet"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("odp", "application/vnd.oasis.opendocument.presentation")
    );

    private final AssetRepository assetRepository;
    private final MediaProperties mediaProperties;
    private final JwtProperties jwtProperties;

    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint) {
        return upload(file, kindHint, null);
    }

    /**
     * @param ownerId when non-null, restricts this asset to the owner + ADMIN/FORMATEUR
     *                (personal documents, avatars). Null keeps it shared/public to any
     *                authenticated user, matching the existing lesson-media behavior.
     */
    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint, UUID ownerId) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Fichier vide.");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = extension(original);
        if (ext.isBlank() || !ALLOWED_EXT.contains(ext)) {
            throw new ApiException("Type de fichier non autorisé.");
        }
        String kind = resolveKind(kindHint, ext);
        String folder = switch (kind) {
            case "VIDEO" -> "videos";
            case "SLIDE" -> "slides";
            case "PDF" -> "pdfs";
            case "DOCUMENT" -> "documents";
            default -> "images";
        };

        // Must be absolute: MultipartFile#transferTo resolves a relative destination
        // against the servlet container's temp work dir (Part#write per the Servlet
        // spec), not the JVM working directory — a relative MEDIA_ROOT would silently
        // write (or fail to write) outside the configured media folder otherwise.
        Path tempDir = Path.of(mediaProperties.getRootPath(), folder).toAbsolutePath().normalize();
        try {
            Files.createDirectories(tempDir);
        } catch (IOException e) {
            throw new ApiException("Impossible de créer le dossier médias.");
        }

        Asset asset = Asset.builder()
                .filename(original)
                .storagePath("pending")
                .mimeType(EXT_TO_MIME.getOrDefault(ext, "application/octet-stream"))
                .sizeBytes(file.getSize())
                .assetKind(kind)
                .ownerId(ownerId)
                .build();
        asset = assetRepository.save(asset);

        Path dest = tempDir.resolve(asset.getId() + (ext.isBlank() ? "" : "." + ext)).normalize();
        try {
            file.transferTo(dest.toFile());
            asset.setStoragePath(dest.toString());
            assetRepository.save(asset);
        } catch (IOException e) {
            assetRepository.delete(asset);
            throw new ApiException("Échec du téléversement : " + e.getMessage());
        }

        return toResponse(asset);
    }

    @Transactional(readOnly = true)
    public SignedStreamResponse createSignedStream(UUID assetId, UserPrincipal requester) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        assertReadable(asset, requester);
        return signStream(asset);
    }

    /**
     * For service-layer callers that have already authorized the request themselves
     * (e.g. StageService checked the caller can view this learner's dossier before
     * building the response) — skips the per-asset ownership check performed by the
     * public /stream endpoint above.
     */
    @Transactional(readOnly = true)
    public SignedStreamResponse createSignedStreamTrusted(UUID assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        return signStream(asset);
    }

    private SignedStreamResponse signStream(Asset asset) {
        long expires = System.currentTimeMillis() / 1000L + mediaProperties.getSignedUrlTtlSeconds();
        String sig = sign(asset.getId(), expires);
        String url = "/api/assets/" + asset.getId() + "/file?expires=" + expires + "&sig=" + sig;
        return new SignedStreamResponse(url, expires);
    }

    /**
     * Owned assets (personal documents, avatars) are only readable by their owner or
     * staff. Ownerless assets (lesson media) stay shared with any authenticated user —
     * unchanged behavior. This is where the signed URL is actually authorized; the
     * downstream /file endpoint only re-checks the HMAC signature by design, since it
     * must work from plain <img>/<video>/<a> src attributes that can't send auth headers.
     */
    private void assertReadable(Asset asset, UserPrincipal requester) {
        if (asset.getOwnerId() == null) {
            return;
        }
        boolean isOwner = requester != null && requester.getId().equals(asset.getOwnerId());
        boolean isStaff = requester != null && requester.getRole().isStaff();
        if (!isOwner && !isStaff) {
            throw new ForbiddenException("Accès refusé à ce média.");
        }
    }

    /** Claims a previously-shared asset as a personal document, e.g. once a stage upload is attached to a learner. */
    @Transactional
    public void claimOwnership(UUID assetId, UUID ownerId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        asset.setOwnerId(ownerId);
        assetRepository.save(asset);
    }

    @Transactional(readOnly = true)
    public Resource loadSignedFile(UUID assetId, long expires, String sig) {
        if (System.currentTimeMillis() / 1000L > expires) {
            throw new ForbiddenException("Lien média expiré.");
        }
        String expected = sign(assetId, expires);
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = sig != null ? sig.getBytes(StandardCharsets.UTF_8) : new byte[0];
        if (!MessageDigest.isEqual(a, b)) {
            throw new ForbiddenException("Signature média invalide.");
        }
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        Path path = Path.of(asset.getStoragePath());
        if (!Files.exists(path)) {
            throw new NotFoundException("Fichier média manquant sur le disque.");
        }
        return new FileSystemResource(path);
    }

    @Transactional(readOnly = true)
    public Asset getAsset(UUID id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
    }

    private AssetResponse toResponse(Asset asset) {
        return new AssetResponse(
                asset.getId(),
                asset.getFilename(),
                asset.getMimeType(),
                asset.getSizeBytes(),
                asset.getAssetKind(),
                asset.getDurationSec(),
                "/api/assets/" + asset.getId() + "/stream"
        );
    }

    private String sign(UUID assetId, long expires) {
        try {
            String secret = mediaProperties.getSigningSecret() == null || mediaProperties.getSigningSecret().isBlank()
                    ? jwtProperties.getSecret()
                    : mediaProperties.getSigningSecret();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal((assetId + ":" + expires).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to sign media URL", e);
        }
    }

    private static final Set<String> VALID_KINDS = Set.of("VIDEO", "PDF", "DOCUMENT", "IMAGE", "SLIDE");

    private String resolveKind(String hint, String ext) {
        if (hint != null && !hint.isBlank()) {
            String normalized = hint.trim().toUpperCase(Locale.ROOT);
            if (VALID_KINDS.contains(normalized)) {
                return normalized;
            }
        }
        if (VIDEO_EXT.contains(ext)) {
            return "VIDEO";
        }
        if (PDF_EXT.contains(ext)) {
            return "PDF";
        }
        if (SLIDE_EXT.contains(ext)) {
            return "SLIDE";
        }
        if (DOCUMENT_EXT.contains(ext)) {
            return "DOCUMENT";
        }
        return "IMAGE";
    }

    private String extension(String filename) {
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i + 1).toLowerCase(Locale.ROOT) : "";
    }
}
