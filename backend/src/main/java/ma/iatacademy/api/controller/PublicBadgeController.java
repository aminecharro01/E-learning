package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.dto.badge.PublicBadgeResponse;
import ma.iatacademy.api.service.BadgeImageService;
import ma.iatacademy.api.service.BadgeService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * Page de partage publique d'un badge (/achievements/{code} côté frontend) — même principe
 * non authentifié que CertificateController#verify, ouvert au crawler LinkedIn qui ne porte
 * jamais de cookie de session.
 */
@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class PublicBadgeController {

    private final BadgeService badgeService;
    private final BadgeImageService badgeImageService;

    @GetMapping("/verify/{code}")
    public ResponseEntity<PublicBadgeResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(badgeService.getPublicBadge(code));
    }

    /** Image "carte d'embarquement" utilisée comme aperçu Open Graph par la page publique. */
    @GetMapping(value = "/verify/{code}/image.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> image(@PathVariable String code) {
        UserBadge userBadge = badgeService.getByShareCode(code);
        User learner = userBadge.getUser();
        String learnerName = learner.getFullName() != null ? learner.getFullName() : learner.getEmail();
        Path path = badgeImageService.getOrGenerateImage(userBadge, learnerName);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                .body(new FileSystemResource(path));
    }
}
