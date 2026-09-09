package ma.iatacademy.api.config;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.access.hierarchicalroles.RoleHierarchyImpl;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final CorsProperties corsProperties;

    // Swagger/OpenAPI is public by default to match the documented demo workflow
    // (DEMO_GUIDE.md). Set SWAGGER_ENABLED=false in production so the API surface
    // isn't handed out to anonymous visitors.
    @Value("${app.swagger.enabled:true}")
    private boolean swaggerEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        List<String> publicPaths = new java.util.ArrayList<>(List.of(
                "/api/auth/register",
                "/api/auth/login",
                // Called with only the short-lived pendingToken from login()'s
                // TotpRequiredException, never a full session cookie - the caller isn't
                // authenticated yet, so this must stay public or the security filter
                // rejects it with a 403 before the code is ever checked (see
                // AuthService#verifyLoginTotp, which validates the pendingToken itself).
                "/api/auth/verify-2fa",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/verify-email",
                "/api/auth/resend-verification",
                "/api/public/contact",
                "/api/public/newsletter",
                "/api/public/stage-signoff/**",
                "/api/certificates/verify/**",
                "/api/badges/verify/**",
                "/api/assets/*/file",
                "/api/assets/*/thumbnail",
                // Static, non-sensitive downloadable templates (e.g. the blank Convention
                // de stage) shipped with the app under resources/static/documents/ — not
                // user data, safe to serve unauthenticated same as any other static asset.
                "/documents/**",
                "/actuator/health"
        ));
        if (swaggerEnabled) {
            publicPaths.addAll(List.of(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/api-docs/**",
                    "/v3/api-docs/**"
            ));
        }

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                // Spring Security sends X-Frame-Options: DENY by default, which blocks the
                // PDF viewer's <iframe src="/api/assets/{id}/file?..."> outright — the
                // frontend (localhost:3000) and API (localhost:8080) are different origins,
                // so even SAMEORIGIN wouldn't help. Replace it with a CSP frame-ancestors
                // allow-list scoped to our own known frontend origins instead of an open door.
                .headers(headers -> headers
                        .frameOptions(frame -> frame.disable())
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "frame-ancestors 'self' " + String.join(" ", corsProperties.getAllowedOrigins())
                        ))
                )
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(publicPaths.toArray(new String[0])).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * SUPER_ADMIN inherits everything ADMIN (Directeur) can do — this hierarchy makes every
     * existing @PreAuthorize("hasRole('ADMIN')") pass for SUPER_ADMIN too, without touching
     * each annotation individually.
     */
    @Bean
    public RoleHierarchy roleHierarchy() {
        return RoleHierarchyImpl.fromHierarchy("ROLE_SUPER_ADMIN > ROLE_ADMIN");
    }

    /**
     * Must be a static bean method: method-security expression handlers are resolved very
     * early during AOP proxy creation, before normal instance beans are safe to wire in.
     */
    @Bean
    static DefaultMethodSecurityExpressionHandler methodSecurityExpressionHandler(RoleHierarchy roleHierarchy) {
        DefaultMethodSecurityExpressionHandler handler = new DefaultMethodSecurityExpressionHandler();
        handler.setRoleHierarchy(roleHierarchy);
        return handler;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.getAllowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
