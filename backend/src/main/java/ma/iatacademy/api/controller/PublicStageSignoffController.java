package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.stage.SignOffRequest;
import ma.iatacademy.api.dto.stage.SignoffInviteView;
import ma.iatacademy.api.service.StageSignoffService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * No @PreAuthorize here on purpose — these two endpoints are the external tutor's
 * only credential-free entry point, gated entirely by possession of an
 * unguessable, single-use, expiring token (see StageSignoffService). Kept under a
 * dedicated /api/public/** prefix so SecurityConfig's allowlist can permit exactly
 * these two paths without exposing the staff-only invite-creation endpoint
 * (POST /api/stage/signoff-invites), which stays behind normal auth.
 */
@RestController
@RequestMapping("/api/public/stage-signoff")
@RequiredArgsConstructor
public class PublicStageSignoffController {

    private final StageSignoffService stageSignoffService;

    @GetMapping("/{token}")
    public ResponseEntity<SignoffInviteView> view(@PathVariable String token) {
        return ResponseEntity.ok(stageSignoffService.getInviteView(token));
    }

    @PostMapping("/{token}/sign")
    public ResponseEntity<MessageResponse> sign(
            @PathVariable String token,
            @Valid @RequestBody SignOffRequest request
    ) {
        return ResponseEntity.ok(stageSignoffService.signOff(token, request));
    }
}
