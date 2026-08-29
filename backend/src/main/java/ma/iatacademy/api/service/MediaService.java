package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.BunnyStreamProperties;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.config.MediaProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.AssetDownload;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.MediaFolderRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
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

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);

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

    private static final Set<String> BUNNY_UPLOADABLE_EXT = Set.of("mp4", "webm");
    private static final String BUNNY_STORAGE_PREFIX = "bunny:";

    private final AssetRepository assetRepository;
    private final MediaFolderRepository mediaFolderRepository;
    private final MediaProperties mediaProperties;
    private final JwtProperties jwtProperties;
    private final BunnyStreamProperties bunnyStreamProperties;
    private final BunnyStreamClient bunnyStreamClient;
    private final AssetDownloadRepository assetDownloadRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final PdfThumbnailBackfillWriter pdfThumbnailBackfillWriter;

    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint) {
        return upload(file, kindHint, null, null);
    }

    /**
     * @param ownerId when non-null, restricts this asset to the owner + ADMIN/FORMATEUR
     *                (personal documents, avatars). Null keeps it shared/public to any
     *                authenticated user, matching the existing lesson-media behavior.
     */
    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint, UUID ownerId) {
        return upload(file, kindHint, ownerId, null);
    }

    /** @param folderId media file-manager folder to file this asset under; null = root/unfiled. */
    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint, UUID ownerId, UUID folderId) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Fichier vide.");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = extension(original);
        if (ext.isBlank() || !ALLOWED_EXT.contains(ext)) {
            throw new ApiException("Type de fichier non autorisé.");
        }
        String kind = resolveKind(kindHint, ext);
        assertWithinSizeLimit(kind, file.getSize());

        if (kind.equals("VIDEO") && bunnyStreamProperties.isEnabled() && BUNNY_UPLOADABLE_EXT.contains(ext)) {
            return uploadToBunny(file, original, ext, ownerId, folderId);
        }

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
                .folderId(folderId)
                .build();
        asset = assetRepository.save(asset);

        Path dest = tempDir.resolve(asset.getId() + (ext.isBlank() ? "" : "." + ext)).normalize();
        try {
            file.transferTo(dest.toFile());
            asset.setStoragePath(dest.toString());
            if (kind.equals("PDF")) {
                asset.setExtractedText(extractPdfText(dest));
                asset.setThumbnailPath(renderPdfThumbnail(dest, asset.getId(), tempDir));
            }
            assetRepository.save(asset);
        } catch (IOException e) {
            assetRepository.delete(asset);
            throw new ApiException("Échec du téléversement : " + e.getMessage());
        }

        return toResponse(asset);
    }

    /**
     * Best-effort only — feeds the global search index (SearchService). A failure here
     * must never fail the upload itself, so any exception is caught and logged.
     */
    private String extractPdfText(Path pdfPath) {
        try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdfPath.toFile())) {
            return new org.apache.pdfbox.text.PDFTextStripper().getText(doc);
        } catch (Exception e) {
            log.warn("PDF text extraction failed for {}: {}", pdfPath, e.getMessage());
            return null;
        }
    }

    /**
     * Renders the PDF's first page to a PNG so the media library grid can show a real
     * preview instead of a generic icon. Best-effort like extractPdfText above — a
     * render failure must never fail the upload, just leaves thumbnailPath null.
     */
    private String renderPdfThumbnail(Path pdfPath, UUID assetId, Path folder) {
        try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdfPath.toFile())) {
            if (doc.getNumberOfPages() == 0) {
                return null;
            }
            var renderer = new org.apache.pdfbox.rendering.PDFRenderer(doc);
            var image = renderer.renderImageWithDPI(0, 96, org.apache.pdfbox.rendering.ImageType.RGB);
            Path thumbPath = folder.resolve(assetId + "-thumb.png");
            javax.imageio.ImageIO.write(image, "png", thumbPath.toFile());
            return thumbPath.toString();
        } catch (Exception e) {
            log.warn("PDF thumbnail rendering failed for {}: {}", pdfPath, e.getMessage());
            return null;
        }
    }

    /**
     * Bunny Stream path: register + upload the video to Bunny instead of writing it to
     * local disk. storagePath is set to "bunny:{guid}" so signStream() knows to hand back
     * Bunny's own HLS URL instead of our local file-serving one — see signStream() below.
     */
    private AssetResponse uploadToBunny(MultipartFile file, String original, String ext, UUID ownerId, UUID folderId) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException("Impossible de lire le fichier vidéo : " + e.getMessage());
        }

        String guid = bunnyStreamClient.createVideo(original);
        bunnyStreamClient.uploadVideoBytes(guid, bytes);

        Asset asset = Asset.builder()
                .filename(original)
                .storagePath(BUNNY_STORAGE_PREFIX + guid)
                .mimeType(EXT_TO_MIME.getOrDefault(ext, "application/octet-stream"))
                .sizeBytes(file.getSize())
                .assetKind("VIDEO")
                .ownerId(ownerId)
                .folderId(folderId)
                .build();
        asset = assetRepository.save(asset);
        return toResponse(asset);
    }

    @Transactional(readOnly = true)
    public SignedStreamResponse createSignedStream(UUID assetId, UserPrincipal requester) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        assertReadable(asset, requester);
        return signStream(asset, false);
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
        return signStream(asset, false);
    }

    /**
     * Records a download-audit row before signing so the ProgressionService gate
     * (asset_downloads existsByUserIdAndAssetId) sees it immediately. Separate from
     * createSignedStream on purpose: /stream is also called by VideoPlayer, AssetImage,
     * and admin previews - piggy-backing here would log every inline preview as a
     * "download".
     */
    @Transactional
    public SignedStreamResponse recordDownloadAndSign(UUID assetId, UserPrincipal requester, UUID lessonId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        assertReadable(asset, requester);
        AssetDownload.AssetDownloadBuilder download = AssetDownload.builder()
                .user(userRepository.getReferenceById(requester.getId()))
                .asset(asset);
        if (lessonId != null) {
            download.lesson(lessonRepository.getReferenceById(lessonId));
        }
        assetDownloadRepository.save(download.build());
        return signStream(asset, true);
    }

    private SignedStreamResponse signStream(Asset asset, boolean forceDownload) {
        long expires = System.currentTimeMillis() / 1000L + mediaProperties.getSignedUrlTtlSeconds();
        if (asset.getStoragePath().startsWith(BUNNY_STORAGE_PREFIX)) {
            // Bunny serves and access-controls this itself — hand back its own hosted
            // player (embedUrl) instead of proxying playback through our own /file
            // endpoint or rendering a bare <video> tag against the raw HLS URL.
            String guid = asset.getStoragePath().substring(BUNNY_STORAGE_PREFIX.length());
            return new SignedStreamResponse(bunnyStreamClient.embedUrl(guid), expires);
        }
        String sig = sign(asset.getId(), expires);
        String url = "/api/assets/" + asset.getId() + "/file?expires=" + expires + "&sig=" + sig
                + (forceDownload ? "&disposition=attachment" : "");
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
        // SUPPORT isn't "staff" for private document access (stage dossiers, submissions),
        // but it does need to see a learner's own profile photo — the same list it's
        // already allowed to browse (GET /api/admin/learners). Scoped to exactly the
        // owner's current avatar, not a blanket staff-style bypass.
        boolean isSupportViewingAvatar = requester != null
                && requester.getRole() == Role.SUPPORT
                && userRepository.findById(asset.getOwnerId())
                        .map(owner -> asset.getId().equals(owner.getAvatarAssetId()))
                        .orElse(false);
        if (!isOwner && !isStaff && !isSupportViewingAvatar) {
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

    /**
     * Bibliothèque de médias réutilisables pour la création de contenu (question,
     * bloc de leçon…) — ownerId IS NULL uniquement : jamais un document privé
     * (avatar, pièce de dossier de stage) dans ce picker partagé.
     */
    @Transactional(readOnly = true)
    public PageResponse<AssetResponse> list(String kind, int page, int size) {
        return list(kind, page, size, null);
    }

    /** @param folderId scopes results to one media-manager folder; null keeps the exact
     *                   behavior of the 3-arg overload above (needed so AssetPicker and any
     *                   other existing caller that never sends a folder stays unaffected). */
    @Transactional(readOnly = true)
    public PageResponse<AssetResponse> list(String kind, int page, int size, UUID folderId) {
        String normalizedKind = kind != null && VALID_KINDS.contains(kind.toUpperCase(Locale.ROOT))
                ? kind.toUpperCase(Locale.ROOT)
                : "IMAGE";
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        var result = folderId == null
                ? assetRepository.findByAssetKindAndOwnerIdIsNullOrderByCreatedAtDesc(normalizedKind, pageable)
                : assetRepository.findByAssetKindAndOwnerIdIsNullAndFolderIdOrderByCreatedAtDesc(normalizedKind, folderId, pageable);
        return PageResponse.from(result.map(this::toResponse));
    }

    /** Root-level (unfiled) browsing for the media file manager — distinct from the 4-arg
     *  list() above, which requires a non-null folderId to apply any folder filtering at all. */
    @Transactional(readOnly = true)
    public PageResponse<AssetResponse> listUnfiled(String kind, int page, int size) {
        String normalizedKind = kind != null && VALID_KINDS.contains(kind.toUpperCase(Locale.ROOT))
                ? kind.toUpperCase(Locale.ROOT)
                : "IMAGE";
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        var result = assetRepository.findByAssetKindAndOwnerIdIsNullAndFolderIdIsNullOrderByCreatedAtDesc(normalizedKind, pageable);
        return PageResponse.from(result.map(this::toResponse));
    }

    /** Kind-agnostic browsing (the media file manager's "all types" view) — see the
     *  AssetRepository method comments for why this must not reuse the kind-defaulting
     *  query paths above. */
    @Transactional(readOnly = true)
    public PageResponse<AssetResponse> listAllKinds(int page, int size, UUID folderId) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        var result = folderId == null
                ? assetRepository.findByOwnerIdIsNullAndFolderIdIsNullOrderByCreatedAtDesc(pageable)
                : assetRepository.findByOwnerIdIsNullAndFolderIdOrderByCreatedAtDesc(folderId, pageable);
        return PageResponse.from(result.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public Asset getAsset(UUID id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
    }

    /** Deletes an asset's physical storage (Bunny video or local disk file, best-effort —
     *  a stale/already-gone remote video shouldn't block cleanup of our own DB row) then
     *  the DB row itself. Used by the media file manager's delete/recursive-folder-delete. */
    @Transactional
    public void deleteAsset(UUID id) {
        Asset asset = getAsset(id);
        if (asset.getStoragePath().startsWith(BUNNY_STORAGE_PREFIX)) {
            String guid = asset.getStoragePath().substring(BUNNY_STORAGE_PREFIX.length());
            try {
                bunnyStreamClient.deleteVideo(guid);
            } catch (ApiException e) {
                log.warn("Bunny delete failed for asset {} (guid {}): {}", id, guid, e.getMessage());
            }
        } else {
            try {
                Files.deleteIfExists(Path.of(asset.getStoragePath()));
            } catch (IOException e) {
                log.warn("Local file delete failed for asset {}: {}", id, e.getMessage());
            }
        }
        if (asset.getThumbnailPath() != null) {
            try {
                Files.deleteIfExists(Path.of(asset.getThumbnailPath()));
            } catch (IOException e) {
                log.warn("Thumbnail delete failed for asset {}: {}", id, e.getMessage());
            }
        }
        assetRepository.delete(asset);
    }

    /** Moves an asset into another media-manager folder; folderId null = move to root. */
    @Transactional
    public AssetResponse moveAsset(UUID assetId, UUID folderId) {
        Asset asset = getAsset(assetId);
        if (folderId != null && !mediaFolderRepository.existsById(folderId)) {
            throw new NotFoundException("Dossier introuvable.");
        }
        asset.setFolderId(folderId);
        return toResponse(assetRepository.save(asset));
    }

    private AssetResponse toResponse(Asset asset) {
        return new AssetResponse(
                asset.getId(),
                asset.getFilename(),
                asset.getMimeType(),
                asset.getSizeBytes(),
                asset.getAssetKind(),
                asset.getDurationSec(),
                "/api/assets/" + asset.getId() + "/stream",
                asset.getFolderId(),
                thumbnailUrl(asset)
        );
    }

    /**
     * VIDEO: Bunny already generates a poster frame, served straight from its public
     * CDN - no signing needed. PDF: a pre-rendered first-page PNG (see
     * renderPdfThumbnail), served through the signed /thumbnail endpoint the same way
     * /file is signed. Everything else (IMAGE renders itself directly, DOCUMENT/SLIDE
     * have no rendering pipeline) gets null and falls back to a generic icon.
     */
    private String thumbnailUrl(Asset asset) {
        long expires = System.currentTimeMillis() / 1000L + mediaProperties.getSignedUrlTtlSeconds();
        boolean isBunnyVideo = asset.getStoragePath().startsWith(BUNNY_STORAGE_PREFIX);
        if (!isBunnyVideo && asset.getThumbnailPath() == null) {
            if (!"PDF".equals(asset.getAssetKind())) {
                return null;
            }
            // Backfill for PDFs uploaded before thumbnail generation existed — render once,
            // lazily, on first read instead of leaving them stuck as a generic icon forever.
            // Rendering happens here (no transaction needed); the write is delegated to a
            // REQUIRES_NEW bean since this method runs inside the caller's read-only tx.
            Path storagePath = Path.of(asset.getStoragePath());
            String rendered = renderPdfThumbnail(storagePath, asset.getId(), storagePath.getParent());
            if (rendered == null) {
                return null;
            }
            asset.setThumbnailPath(rendered);
            pdfThumbnailBackfillWriter.persist(asset.getId(), rendered);
        }
        // Bunny's pull zone has referrer/hotlink protection, so the raw CDN thumbnail URL
        // 403s from a browser <img> tag — proxy it through this same signed endpoint
        // instead (see loadSignedThumbnail's Bunny branch), which fetches the bytes
        // server-side with the right Referer.
        String sig = sign(asset.getId(), expires);
        return "/api/assets/" + asset.getId() + "/thumbnail?expires=" + expires + "&sig=" + sig;
    }

    /** Bunny video posters are JPEG; PDF-rendered posters are PNG — the controller needs
     * the right Content-Type since it sets X-Content-Type-Options: nosniff (a mismatched
     * declared type makes the browser refuse to render the image instead of sniffing it). */
    public record SignedThumbnail(Resource resource, String contentType) {}

    @Transactional(readOnly = true)
    public SignedThumbnail loadSignedThumbnail(UUID assetId, long expires, String sig) {
        if (System.currentTimeMillis() / 1000L > expires) {
            throw new ForbiddenException("Lien média expiré.");
        }
        if (!MessageDigest.isEqual(sign(assetId, expires).getBytes(StandardCharsets.UTF_8),
                sig != null ? sig.getBytes(StandardCharsets.UTF_8) : new byte[0])) {
            throw new ForbiddenException("Signature média invalide.");
        }
        Asset asset = getAsset(assetId);
        if (asset.getStoragePath().startsWith(BUNNY_STORAGE_PREFIX)) {
            String guid = asset.getStoragePath().substring(BUNNY_STORAGE_PREFIX.length());
            byte[] bytes = bunnyStreamClient.fetchThumbnailBytes(guid);
            return new SignedThumbnail(new org.springframework.core.io.ByteArrayResource(bytes), "image/jpeg");
        }
        if (asset.getThumbnailPath() == null) {
            throw new NotFoundException("Aucune miniature pour ce fichier.");
        }
        Path path = Path.of(asset.getThumbnailPath());
        if (!Files.exists(path)) {
            throw new NotFoundException("Miniature manquante sur le disque.");
        }
        return new SignedThumbnail(new FileSystemResource(path), "image/png");
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

    private void assertWithinSizeLimit(String kind, long sizeBytes) {
        long limit = switch (kind) {
            case "VIDEO" -> mediaProperties.getMaxVideoSizeBytes();
            case "IMAGE" -> mediaProperties.getMaxImageSizeBytes();
            default -> mediaProperties.getMaxDocumentSizeBytes(); // PDF, DOCUMENT, SLIDE
        };
        if (sizeBytes > limit) {
            throw new ApiException(
                    "Fichier trop volumineux : %.1f Mo (max %.0f Mo pour ce type de fichier)."
                            .formatted(sizeBytes / 1_048_576.0, limit / 1_048_576.0));
        }
    }

    private String extension(String filename) {
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i + 1).toLowerCase(Locale.ROOT) : "";
    }
}
