package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.config.MediaProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
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
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {

    private static final Set<String> VIDEO_EXT = Set.of("mp4", "webm", "m3u8", "ts");
    private static final Set<String> PDF_EXT = Set.of("pdf");
    private static final Set<String> IMAGE_EXT = Set.of("png", "jpg", "jpeg", "gif", "webp");
    private static final Set<String> DOCUMENT_EXT = Set.of("pdf", "doc", "docx", "ppt", "pptx", "odt", "ods");

    private final AssetRepository assetRepository;
    private final MediaProperties mediaProperties;
    private final JwtProperties jwtProperties;

    @Transactional
    public AssetResponse upload(MultipartFile file, String kindHint) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Fichier vide.");
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = extension(original);
        String kind = resolveKind(kindHint, ext, file.getContentType());
        String folder = switch (kind) {
            case "VIDEO" -> "videos";
            case "SLIDE" -> "slides";
            case "PDF" -> "pdfs";
            case "DOCUMENT" -> "documents";
            default -> "images";
        };

        Path tempDir = Path.of(mediaProperties.getRootPath(), folder).normalize();
        try {
            Files.createDirectories(tempDir);
        } catch (IOException e) {
            throw new ApiException("Impossible de créer le dossier médias.");
        }

        Asset asset = Asset.builder()
                .filename(original)
                .storagePath("pending")
                .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .sizeBytes(file.getSize())
                .assetKind(kind)
                .build();
        asset = assetRepository.save(asset);

        Path dest = tempDir.resolve(asset.getId() + (ext.isBlank() ? "" : "." + ext)).normalize();
        try {
            file.transferTo(dest.toFile());
            asset.setStoragePath(dest.toString());
            assetRepository.save(asset);
        } catch (IOException e) {
            assetRepository.delete(asset);
            throw new ApiException("Échec de l'upload: " + e.getMessage());
        }

        return toResponse(asset);
    }

    @Transactional(readOnly = true)
    public SignedStreamResponse createSignedStream(UUID assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        long expires = System.currentTimeMillis() / 1000L + mediaProperties.getSignedUrlTtlSeconds();
        String sig = sign(asset.getId(), expires);
        String url = "/api/assets/" + asset.getId() + "/file?expires=" + expires + "&sig=" + sig;
        return new SignedStreamResponse(url, expires);
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

    private String resolveKind(String hint, String ext, String mime) {
        if (hint != null && !hint.isBlank()) {
            return hint.trim().toUpperCase(Locale.ROOT);
        }
        if (VIDEO_EXT.contains(ext) || (mime != null && mime.startsWith("video/"))) {
            return "VIDEO";
        }
        if (PDF_EXT.contains(ext) || "application/pdf".equalsIgnoreCase(mime)) {
            return "PDF";
        }
        if (DOCUMENT_EXT.contains(ext)) {
            return "DOCUMENT";
        }
        if (IMAGE_EXT.contains(ext) || (mime != null && mime.startsWith("image/"))) {
            return "IMAGE";
        }
        return "DOCUMENT";
    }

    private String extension(String filename) {
        int i = filename.lastIndexOf('.');
        return i >= 0 ? filename.substring(i + 1).toLowerCase(Locale.ROOT) : "";
    }
}
