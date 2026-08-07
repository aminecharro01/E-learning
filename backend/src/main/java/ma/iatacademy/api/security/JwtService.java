package ma.iatacademy.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.domain.enums.Role;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID userId, String email, Role role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + properties.getExpirationMs());
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /** Jeton court (5 min), jamais posé en cookie — porté par le corps de la réponse le temps de saisir le code TOTP. */
    public String generatePendingTotpToken(UUID userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 5 * 60 * 1000L);
        return Jwts.builder()
                .subject(userId.toString())
                .claim("pending2fa", true)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public UUID extractPendingTotpUserId(String token) {
        Claims claims = parseClaims(token);
        if (!Boolean.TRUE.equals(claims.get("pending2fa", Boolean.class))) {
            throw new IllegalArgumentException("Not a pending 2FA token");
        }
        return UUID.fromString(claims.getSubject());
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public boolean isValid(String token) {
        try {
            Claims claims = parseClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception ex) {
            return false;
        }
    }

    public String getCookieName() {
        return properties.getCookieName();
    }

    public long getExpirationMs() {
        return properties.getExpirationMs();
    }
}
