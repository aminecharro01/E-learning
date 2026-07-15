package ma.iatacademy.api.service;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.ChangePasswordRequest;
import ma.iatacademy.api.dto.LoginRequest;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.RegisterRequest;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.security.JwtService;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final AuthenticationManager authenticationManager;
    private final RateLimitService rateLimitService;
    private final AppSettingsService appSettingsService;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (!appSettingsService.isRegistrationEnabled()) {
            throw new ApiException("Les inscriptions sont temporairement fermées.");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException("Un compte existe déjà avec cet email.");
        }
        User user = User.builder()
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role(Role.ETUDIANT)
                .enabled(true)
                .build();
        userRepository.save(user);
        return toResponse(user);
    }

    public UserResponse login(LoginRequest request, String clientIp, HttpServletResponse response) {
        rateLimitService.checkLoginAllowed(clientIp);
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim().toLowerCase(), request.password()));
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtService.generateToken(principal.getId(), principal.getEmail(), principal.getRole());
        attachJwtCookie(response, token);
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        return toResponse(user);
    }

    public void logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(jwtService.getCookieName(), "")
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public UserResponse me(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        return toResponse(user);
    }

    @Transactional
    public MessageResponse changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException("Mot de passe actuel incorrect.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ApiException("Le nouveau mot de passe doit être différent de l'actuel.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Mot de passe mis à jour.");
    }

    private void attachJwtCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from(jwtService.getCookieName(), token)
                .httpOnly(true)
                .secure(jwtProperties.isCookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled()
        );
    }
}
