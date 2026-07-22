package ma.iatacademy.api.service;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.ChangePasswordRequest;
import ma.iatacademy.api.dto.LoginRequest;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.RegisterRequest;
import ma.iatacademy.api.dto.UpdateProfileRequest;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.security.JwtService;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Year;
import java.util.UUID;

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
    private final MediaService mediaService;

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
                .enabled(false)
                .paymentStatus(PaymentStatus.PENDING)
                .enrollmentYear(Year.now().getValue())
                .build();
        userRepository.save(user);
        return toResponse(user);
    }

    public UserResponse login(LoginRequest request, String clientIp, HttpServletResponse response) {
        rateLimitService.checkLoginAllowed(clientIp);
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email().trim().toLowerCase(), request.password()));
        } catch (DisabledException ex) {
            throw new ApiException(
                    "Votre compte est en attente d'activation par le directeur de l'académie "
                            + "(après validation du paiement).");
        } catch (BadCredentialsException ex) {
            throw new ApiException("Email ou mot de passe incorrect.");
        }
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
    public UserResponse updateProfile(UserPrincipal principal, UpdateProfileRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole() == Role.ETUDIANT) {
            throw new ForbiddenException(
                    "Les informations personnelles ne sont modifiables que par l'administration. "
                            + "Vous pouvez uniquement changer votre photo de profil.");
        }
        applyProfileFields(user, request);
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateAvatar(UserPrincipal principal, MultipartFile file) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        AssetResponse asset = mediaService.upload(file, "IMAGE");
        if (!"IMAGE".equals(asset.assetKind())) {
            throw new ApiException("La photo de profil doit être une image (PNG, JPG, WEBP…).");
        }
        user.setAvatarAssetId(asset.id());
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public UserResponse adminUpdateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        applyProfileFields(user, request);
        userRepository.save(user);
        return toResponse(user);
    }

    private static void applyProfileFields(User user, UpdateProfileRequest request) {
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null) {
            user.setPhone(blankToNull(request.phone()));
        }
        if (request.cin() != null) {
            user.setCin(blankToNull(request.cin()));
        }
        if (request.birthDate() != null) {
            user.setBirthDate(request.birthDate());
        }
        if (request.address() != null) {
            user.setAddress(blankToNull(request.address()));
        }
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

    static UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isEnabled(),
                user.getPhone(),
                user.getCin(),
                user.getBirthDate(),
                user.getAddress(),
                user.getEnrollmentYear(),
                user.getPaymentStatus(),
                user.getActivatedAt(),
                user.isYear2AccessEnabled(),
                user.getAvatarAssetId()
        );
    }

    private static String blankToNull(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
