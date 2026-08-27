package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.BunnyStreamProperties;
import ma.iatacademy.api.exception.ApiException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper around the Bunny Stream HTTP API (https://docs.bunny.net/api-reference/stream) —
 * two calls to publish a video (create the video object, then upload the bytes), plus the
 * playback URL builder. Only ever invoked when {@link BunnyStreamProperties#isEnabled()} is
 * true; see MediaService for the branch point that falls back to local disk otherwise.
 */
@Service
@RequiredArgsConstructor
public class BunnyStreamClient {

    private final BunnyStreamProperties properties;
    private final RestClient restClient = RestClient.create();

    private record CreateVideoResponse(String guid) {}

    /** Step 1: register a video object in the library, returns its GUID. */
    public String createVideo(String title) {
        try {
            CreateVideoResponse response = restClient.post()
                    .uri("https://video.bunnycdn.com/library/{libraryId}/videos", properties.getLibraryId())
                    .header("AccessKey", properties.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TitleBody(title))
                    .retrieve()
                    .body(CreateVideoResponse.class);
            if (response == null || response.guid() == null || response.guid().isBlank()) {
                throw new ApiException("Bunny Stream n'a pas renvoyé d'identifiant de vidéo.");
            }
            return response.guid();
        } catch (RestClientException e) {
            throw new ApiException("Échec de la création de la vidéo sur Bunny Stream : " + e.getMessage());
        }
    }

    private record TitleBody(String title) {}

    /** Step 2: upload the raw video bytes for a previously-created GUID. */
    public void uploadVideoBytes(String guid, byte[] bytes) {
        try {
            restClient.put()
                    .uri("https://video.bunnycdn.com/library/{libraryId}/videos/{guid}", properties.getLibraryId(), guid)
                    .header("AccessKey", properties.getApiKey())
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(bytes)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new ApiException("Échec de l'envoi de la vidéo vers Bunny Stream : " + e.getMessage());
        }
    }

    /** HLS playback URL served from the library's pull zone / CDN. */
    public String hlsPlaybackUrl(String guid) {
        return "https://" + properties.getPullZoneHostname() + "/" + guid + "/playlist.m3u8";
    }

    /** Bunny's own hosted player (adaptive quality picker, thumbnails, analytics) — used
     * instead of the raw HLS URL so playback goes through Bunny's actual UI, not a bare
     * native &lt;video&gt; tag. */
    public String embedUrl(String guid) {
        return "https://iframe.mediadelivery.net/embed/" + properties.getLibraryId() + "/" + guid;
    }

    /**
     * Bunny auto-generates a poster frame for every video. When the pull zone has Token
     * Authentication enabled (the default on a fresh Stream library — an unsigned request
     * 403s), the URL is signed with Bunny's CDN token-auth scheme:
     * token = base64url(SHA256(securityKey + urlPath + expires)), appended as
     * ?token=...&expires=.... Left unsigned when no key is configured.
     */
    public String thumbnailUrl(String guid, long expires) {
        String path = "/" + guid + "/thumbnail.jpg";
        String base = "https://" + properties.getPullZoneHostname() + path;
        if (properties.getTokenAuthKey() == null || properties.getTokenAuthKey().isBlank()) {
            return base;
        }
        String token = signToken(path, expires);
        return base + "?token=" + token + "&expires=" + expires;
    }

    private String signToken(String path, long expires) {
        String hashable = properties.getTokenAuthKey() + path + expires;
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(hashable.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.Base64.getEncoder().encodeToString(hash)
                    .replace("+", "-")
                    .replace("/", "_")
                    .replace("=", "");
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible.", e);
        }
    }

    /** Permanently deletes a video from the library — used by the media file manager. */
    public void deleteVideo(String guid) {
        try {
            restClient.delete()
                    .uri("https://video.bunnycdn.com/library/{libraryId}/videos/{guid}", properties.getLibraryId(), guid)
                    .header("AccessKey", properties.getApiKey())
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new ApiException("Échec de la suppression de la vidéo sur Bunny Stream : " + e.getMessage());
        }
    }
}
