package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.badge.BadgeResponse;
import ma.iatacademy.api.dto.badge.LevelResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.BadgeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;

    @GetMapping
    public ResponseEntity<List<BadgeResponse>> list(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(badgeService.listForUser(principal.getId()));
    }

    @GetMapping("/level")
    public ResponseEntity<LevelResponse> level(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(badgeService.level(principal.getId()));
    }
}
