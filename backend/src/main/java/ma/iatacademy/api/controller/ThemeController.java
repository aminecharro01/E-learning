package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.ThemeResponse;
import ma.iatacademy.api.service.AppSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Any authenticated user can read the platform's chosen theme preset to render it —
 * unlike /api/admin/settings/app (SUPER_ADMIN only), this exposes nothing else.
 */
@RestController
@RequestMapping("/api/me/theme")
@RequiredArgsConstructor
public class ThemeController {

    private final AppSettingsService appSettingsService;

    @GetMapping
    public ResponseEntity<ThemeResponse> get() {
        return ResponseEntity.ok(new ThemeResponse(appSettingsService.getThemeVariant()));
    }
}
