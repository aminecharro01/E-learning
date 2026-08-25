package ma.iatacademy.api.service;

import jakarta.servlet.http.HttpServletResponse;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.config.EmailProperties;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.ChangePasswordRequest;
import ma.iatacademy.api.dto.LoginRequest;
import ma.iatacademy.api.dto.RegisterRequest;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.domain.enums.Civility;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.TotpRequiredException;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.JwtService;
import ma.iatacademy.api.security.TotpService;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private JwtProperties jwtProperties;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private RateLimitService rateLimitService;
    @Mock
    private AppSettingsService appSettingsService;
    @Mock
    private MediaService mediaService;
    @Mock
    private EmailService emailService;
    @Mock
    private EmailProperties emailProperties;
    @Mock
    private AppPlatformProperties appPlatformProperties;
    @Mock
    private BadgeService badgeService;
    @Mock
    private TotpService totpService;

    @InjectMocks
    private AuthService authService;

    private static RegisterRequest validRegisterRequest() {
        return new RegisterRequest(Civility.MR, "Amine Test", "Casablanca", "0600000000",
                "amine@example.com", "Bac+5", "Lycee", "Password1", true);
    }

    @Test
    void registerRejectsWhenEmailAlreadyExists() {
        when(appSettingsService.isRegistrationEnabled()).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("amine@example.com")).thenReturn(true);

        assertThrows(ApiException.class, () -> authService.register(validRegisterRequest(), "1.2.3.4"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerRejectsWhenRegistrationDisabled() {
        when(appSettingsService.isRegistrationEnabled()).thenReturn(false);

        assertThrows(ApiException.class, () -> authService.register(validRegisterRequest(), "1.2.3.4"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerCreatesDisabledUnverifiedLearnerAndSendsEmail() {
        when(appSettingsService.isRegistrationEnabled()).thenReturn(true);
        when(userRepository.existsByEmailIgnoreCase("amine@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(emailProperties.getFrontendBaseUrl()).thenReturn("http://localhost:3000");
        when(appPlatformProperties.getName()).thenReturn("IAT Academy");

        UserResponse response = authService.register(validRegisterRequest(), "1.2.3.4");

        assertEquals(Role.ETUDIANT, response.role());
        assertEquals(false, response.enabled());
        verify(userRepository, times(1)).save(any(User.class));
        verify(emailService, times(1)).send(any(), any(), any());
    }

    @Test
    void loginRejectsDisabledAccountWithFrenchMessage() {
        when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("disabled"));

        ApiException ex = assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("a@a.com", "pw"), "1.2.3.4", mock(HttpServletResponse.class)));
        assertEquals(true, ex.getMessage().contains("directeur"));
    }

    @Test
    void loginRejectsBadCredentials() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

        assertThrows(ApiException.class,
                () -> authService.login(new LoginRequest("a@a.com", "pw"), "1.2.3.4", mock(HttpServletResponse.class)));
    }

    @Test
    void loginRequiresTotpWhenEnabled() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("a@a.com").role(Role.ETUDIANT).enabled(true).totpEnabled(true).build();
        UserPrincipal principal = new UserPrincipal(user);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtService.generatePendingTotpToken(userId)).thenReturn("pending-token");

        TotpRequiredException ex = assertThrows(TotpRequiredException.class,
                () -> authService.login(new LoginRequest("a@a.com", "pw"), "1.2.3.4", mock(HttpServletResponse.class)));
        assertEquals("pending-token", ex.getPendingToken());
    }

    @Test
    void loginSucceedsAndAttachesJwtCookie() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("a@a.com").role(Role.ETUDIANT).enabled(true).totpEnabled(false).build();
        UserPrincipal principal = new UserPrincipal(user);
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(userId, "a@a.com", Role.ETUDIANT)).thenReturn("jwt-token");
        when(jwtService.getCookieName()).thenReturn("iat_token");
        when(jwtService.getExpirationMs()).thenReturn(86_400_000L);

        HttpServletResponse response = mock(HttpServletResponse.class);
        UserResponse result = authService.login(new LoginRequest("a@a.com", "pw"), "1.2.3.4", response);

        assertEquals(userId, result.id());
        verify(response, times(1)).addHeader(any(), any());
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).passwordHash("hash").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "hash")).thenReturn(false);
        UserPrincipal principal = new UserPrincipal(user);

        assertThrows(ApiException.class,
                () -> authService.changePassword(principal, new ChangePasswordRequest("wrong", "newpassword1")));
    }

    @Test
    void changePasswordRejectsSameNewPassword() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).passwordHash("hash").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        lenient().when(passwordEncoder.matches("samepass", "hash")).thenReturn(true);
        UserPrincipal principal = new UserPrincipal(user);

        assertThrows(ApiException.class,
                () -> authService.changePassword(principal, new ChangePasswordRequest("samepass", "samepass")));
    }

    @Test
    void changePasswordSucceedsWithDifferentPassword() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).passwordHash("hash").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current", "hash")).thenReturn(true);
        when(passwordEncoder.encode("newpassword1")).thenReturn("newhash");
        UserPrincipal principal = new UserPrincipal(user);

        authService.changePassword(principal, new ChangePasswordRequest("current", "newpassword1"));

        verify(userRepository, times(1)).save(any(User.class));
    }
}
