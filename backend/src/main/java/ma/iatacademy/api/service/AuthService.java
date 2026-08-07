package ma.iatacademy.api.service;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;
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
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.exception.TotpRequiredException;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.config.EmailProperties;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.security.JwtService;
import ma.iatacademy.api.security.TotpService;
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
import java.time.Instant;
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
    private final EmailService emailService;
    private final EmailProperties emailProperties;
    private final AppPlatformProperties appPlatformProperties;
    private final BadgeService badgeService;
    private final TotpService totpService;

    @Transactional
    public UserResponse register(RegisterRequest request, String ip) {
        rateLimitService.checkRegisterAllowed(ip);
        if (!appSettingsService.isRegistrationEnabled()) {
            throw new ApiException("Les inscriptions sont temporairement fermées.");
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException("Un compte existe déjà avec ce courriel.");
        }
        String fullName = request.fullName().trim();
        String[] nameParts = fullName.split("\\s+", 2);
        String firstName = nameParts[0];
        String lastName = nameParts.length > 1 ? nameParts[1] : null;
        String verificationToken = UUID.randomUUID().toString();
        User user = User.builder()
                .email(request.email().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(fullName)
                .civility(request.civility())
                .firstName(firstName)
                .lastName(lastName)
                .country("Maroc")
                .city(request.city().trim())
                .phone(request.phone().trim())
                .educationLevel(request.educationLevel().trim())
                .lastSchoolType(request.lastSchoolType().trim())
                .termsAcceptedAt(Instant.now())
                .marketingOptIn(true)
                .role(Role.ETUDIANT)
                .enabled(false)
                .paymentStatus(PaymentStatus.PENDING)
                .enrollmentYear(Year.now().getValue())
                .emailVerified(false)
                .verificationToken(verificationToken)
                .verificationTokenExpiresAt(Instant.now().plus(Duration.ofHours(24)))
                .build();
        userRepository.save(user);
        sendVerificationEmail(user, verificationToken);
        return toResponse(user);
    }

    /** Always returns silently (whether or not the email matches) to avoid account enumeration. */
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request, String ip) {
        rateLimitService.checkPasswordResetAllowed(ip);
        userRepository.findByEmailIgnoreCase(request.email().trim().toLowerCase()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiresAt(Instant.now().plus(Duration.ofHours(1)));
            userRepository.save(user);
            sendResetEmail(user, token);
        });
        return new MessageResponse(
                "Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetToken(request.token())
                .filter(u -> u.getResetTokenExpiresAt() != null && u.getResetTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException("Lien de réinitialisation invalide ou expiré."));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiresAt(null);
        userRepository.save(user);
        return new MessageResponse("Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.");
    }

    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByVerificationToken(request.token())
                .filter(u -> u.getVerificationTokenExpiresAt() != null
                        && u.getVerificationTokenExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException("Lien de vérification invalide ou expiré."));
        user.setEmailVerified(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiresAt(null);
        userRepository.save(user);
        return new MessageResponse("Adresse e-mail vérifiée.");
    }

    /**
     * Première connexion d'un compte importé : remplace l'email placeholder par le vrai
     * email, force un mot de passe personnel (le mot de passe par défaut est partagé
     * entre tous les comptes importés) et bascule le compte en authentification email.
     */
    @Transactional
    public UserResponse completeProfile(UserPrincipal principal, CompleteProfileRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.isProfileCompleted()) {
            throw new ApiException("Votre profil est déjà complété.");
        }
        String email = request.email().trim().toLowerCase();
        userRepository.findByEmailIgnoreCase(email)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new ApiException("Un compte existe déjà avec ce courriel.");
                });
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException("Choisissez un mot de passe différent du mot de passe par défaut.");
        }
        user.setEmail(email);
        user.setPhone(request.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setEmailVerified(true);
        user.setProfileCompleted(true);
        userRepository.save(user);
        badgeService.awardIfAbsent(user, BadgeCode.PROFILE_COMPLETE);
        return toResponse(user);
    }

    /** Silent no-op if the email is unknown or already verified, same anti-enumeration reasoning as forgotPassword. */
    @Transactional
    public MessageResponse resendVerification(ForgotPasswordRequest request, String ip) {
        rateLimitService.checkResendVerificationAllowed(ip);
        userRepository.findByEmailIgnoreCase(request.email().trim().toLowerCase())
                .filter(u -> !u.isEmailVerified())
                .ifPresent(user -> {
                    String token = UUID.randomUUID().toString();
                    user.setVerificationToken(token);
                    user.setVerificationTokenExpiresAt(Instant.now().plus(Duration.ofHours(24)));
                    userRepository.save(user);
                    sendVerificationEmail(user, token);
                });
        return new MessageResponse("Si ce compte existe et n'est pas encore vérifié, un e-mail a été envoyé.");
    }

    private void sendResetEmail(User user, String token) {
        String link = emailProperties.getFrontendBaseUrl() + "/reset-password?token=" + token;
        String body = "<p>Bonjour " + escapeHtml(firstNameOrEmpty(user)) + ",</p>"
                + "<p>Vous avez demandé la réinitialisation de votre mot de passe " + escapeHtml(appPlatformProperties.getName()) + ".</p>"
                + "<p><a href=\"" + link + "\">Réinitialiser mon mot de passe</a></p>"
                + "<p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>";
        emailService.send(user.getEmail(), "Réinitialisation de votre mot de passe", body);
    }

    private void sendVerificationEmail(User user, String token) {
        String link = emailProperties.getFrontendBaseUrl() + "/verify-email?token=" + token;
        String body = "<p>Bonjour " + escapeHtml(firstNameOrEmpty(user)) + ",</p>"
                + "<p>Bienvenue sur " + escapeHtml(appPlatformProperties.getName()) + ". Confirmez votre adresse e-mail pour finaliser votre inscription.</p>"
                + "<p><a href=\"" + link + "\">Confirmer mon e-mail</a></p>"
                + "<p>Ce lien expire dans 24 heures.</p>";
        emailService.send(user.getEmail(), "Confirmez votre adresse e-mail", body);
    }

    private static String firstNameOrEmpty(User user) {
        return user.getFirstName() != null ? user.getFirstName() : "";
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    // @Transactional requis : toResponse() lit user.getGroup(), une association LAZY
    // qui lèverait une LazyInitializationException hors session Hibernate.
    @Transactional(readOnly = true)
    public UserResponse login(LoginRequest request, String clientIp, HttpServletResponse response) {
        rateLimitService.checkLoginAllowed(clientIp);
        Authentication authentication;
        try {
            // Pas de toLowerCase() : l'identifiant peut être un matricule/CIN en
            // majuscules. La casse est gérée côté lookup (findBy...IgnoreCase).
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.email().trim(), request.password()));
        } catch (DisabledException ex) {
            throw new ApiException(
                    "Votre compte est en attente d'activation par le directeur de l'académie "
                            + "(après validation du paiement).");
        } catch (BadCredentialsException ex) {
            throw new ApiException("Courriel ou mot de passe incorrect.");
        }
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));

        // Mot de passe valide, mais 2FA activée : pas de cookie JWT tant que le code
        // TOTP n'est pas vérifié (voir verifyLoginTotp). Comportement strictement
        // inchangé pour tout compte n'ayant pas activé la 2FA (l'immense majorité).
        if (user.isTotpEnabled()) {
            throw new TotpRequiredException(jwtService.generatePendingTotpToken(user.getId()));
        }

        String token = jwtService.generateToken(principal.getId(), principal.getEmail(), principal.getRole());
        attachJwtCookie(response, token);
        return toResponse(user);
    }

    /** Deuxième étape du login quand la 2FA est activée — même effet de bord que login() une fois le code validé. */
    @Transactional
    public UserResponse verifyLoginTotp(VerifyTotpLoginRequest request, HttpServletResponse response) {
        UUID userId;
        try {
            userId = jwtService.extractPendingTotpUserId(request.pendingToken());
        } catch (Exception e) {
            throw new ApiException("Session de connexion expirée, reconnectez-vous.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        if (!user.isTotpEnabled() || user.getTotpSecret() == null || !totpService.verify(user.getTotpSecret(), request.code())) {
            throw new ApiException("Code de vérification invalide.");
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());
        attachJwtCookie(response, token);
        return toResponse(user);
    }

    /** Génère un secret TOTP en attente de confirmation — 2FA pas encore active tant que confirmTotp() n'a pas validé un code. */
    @Transactional
    public EnableTotpResponse enableTotp(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        String secret = totpService.generateSecret();
        user.setTotpSecret(secret);
        user.setTotpEnabled(false);
        userRepository.save(user);
        String uri = totpService.otpauthUri(secret, user.getEmail(), appPlatformProperties.getName());
        return new EnableTotpResponse(secret, uri);
    }

    @Transactional
    public MessageResponse confirmTotp(UserPrincipal principal, TotpCodeRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        if (user.getTotpSecret() == null) {
            throw new ApiException("Activez d'abord la 2FA avant de confirmer un code.");
        }
        if (!totpService.verify(user.getTotpSecret(), request.code())) {
            throw new ApiException("Code invalide.");
        }
        user.setTotpEnabled(true);
        userRepository.save(user);
        return new MessageResponse("2FA activée.");
    }

    @Transactional
    public MessageResponse disableTotp(UserPrincipal principal, TotpCodeRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Utilisateur introuvable."));
        if (!user.isTotpEnabled() || user.getTotpSecret() == null || !totpService.verify(user.getTotpSecret(), request.code())) {
            throw new ApiException("Code invalide.");
        }
        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        userRepository.save(user);
        return new MessageResponse("2FA désactivée.");
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

    @Transactional(readOnly = true)
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
        AssetResponse asset = mediaService.upload(file, "IMAGE", principal.getId());
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
        if (request.civility() != null) {
            user.setCivility(request.civility());
        }
        if (request.firstName() != null) {
            user.setFirstName(blankToNull(request.firstName()));
        }
        if (request.lastName() != null) {
            user.setLastName(blankToNull(request.lastName()));
        }
        if (request.firstName() != null || request.lastName() != null) {
            String fn = user.getFirstName() != null ? user.getFirstName() : "";
            String ln = user.getLastName() != null ? user.getLastName() : "";
            String derived = (fn + " " + ln).trim();
            if (!derived.isEmpty()) {
                user.setFullName(derived);
            }
        }
        if (request.country() != null) {
            user.setCountry(blankToNull(request.country()));
        }
        if (request.city() != null) {
            user.setCity(blankToNull(request.city()));
        }
        if (request.educationLevel() != null) {
            user.setEducationLevel(blankToNull(request.educationLevel()));
        }
        if (request.lastSchoolType() != null) {
            user.setLastSchoolType(blankToNull(request.lastSchoolType()));
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
                user.getCivility(),
                user.getFirstName(),
                user.getLastName(),
                user.getCountry(),
                user.getCity(),
                user.getEducationLevel(),
                user.getLastSchoolType(),
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
                user.getAvatarAssetId(),
                user.getTermsAcceptedAt(),
                user.isMarketingOptIn(),
                user.getMatricule(),
                user.isProfileCompleted(),
                user.getGroup() != null ? user.getGroup().getId() : null,
                user.getGroup() != null ? user.getGroup().getName() : null
        );
    }

    private static String blankToNull(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
