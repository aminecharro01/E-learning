package ma.iatacademy.api.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.SecurityProperties;
import ma.iatacademy.api.dto.ChangePasswordRequest;
import ma.iatacademy.api.dto.CompleteProfileRequest;
import ma.iatacademy.api.dto.EnableTotpResponse;
import ma.iatacademy.api.dto.ForgotPasswordRequest;
import ma.iatacademy.api.dto.LoginRequest;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.RegisterRequest;
import ma.iatacademy.api.dto.ResetPasswordRequest;
import ma.iatacademy.api.dto.TotpCodeRequest;
import ma.iatacademy.api.dto.UpdateProfileRequest;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.dto.VerifyEmailRequest;
import ma.iatacademy.api.dto.VerifyTotpLoginRequest;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SecurityProperties securityProperties;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = resolveClientIp(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request, ip));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        String ip = resolveClientIp(httpRequest);
        return ResponseEntity.ok(authService.login(request, ip, httpResponse));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<UserResponse> verifyTotpLogin(
            @Valid @RequestBody VerifyTotpLoginRequest request,
            HttpServletResponse httpResponse
    ) {
        return ResponseEntity.ok(authService.verifyLoginTotp(request, httpResponse));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<EnableTotpResponse> enableTotp(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.enableTotp(principal));
    }

    @PostMapping("/2fa/confirm")
    public ResponseEntity<MessageResponse> confirmTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TotpCodeRequest request
    ) {
        return ResponseEntity.ok(authService.confirmTotp(principal, request));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<MessageResponse> disableTotp(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TotpCodeRequest request
    ) {
        return ResponseEntity.ok(authService.disableTotp(principal, request));
    }

    @PostMapping("/logout")
    public ResponseEntity<MessageResponse> logout(HttpServletResponse response) {
        authService.logout(response);
        return ResponseEntity.ok(new MessageResponse("Déconnexion réussie."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = resolveClientIp(httpRequest);
        return ResponseEntity.ok(authService.forgotPassword(request, ip));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        String ip = resolveClientIp(httpRequest);
        return ResponseEntity.ok(authService.resendVerification(request, ip));
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        return ResponseEntity.ok(authService.changePassword(principal, request));
    }

    @PatchMapping("/complete-profile")
    public ResponseEntity<UserResponse> completeProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CompleteProfileRequest request
    ) {
        return ResponseEntity.ok(authService.completeProfile(principal, request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.me(principal));
    }

    @PatchMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(principal, request));
    }

    @PostMapping(value = "/profile/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(authService.updateAvatar(principal, file));
    }

    /**
     * X-Forwarded-For is only honored when the direct connection comes from a
     * configured trusted reverse proxy (app.security.trusted-proxies). Otherwise it's
     * a client-supplied header an attacker can set to a fresh value on every request,
     * which would let RateLimitService's per-IP login throttle be bypassed entirely.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (securityProperties.getTrustedProxies().contains(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }
}
