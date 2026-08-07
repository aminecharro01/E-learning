package ma.iatacademy.api.security;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * TOTP (RFC 6238) implémenté à la main avec HmacSHA1 — même style que la signature
 * HMAC déjà utilisée par MediaService pour les URLs de médias, pour ne pas ajouter
 * de dépendance juste pour du HMAC. Compatible avec Google Authenticator / Authy
 * (période 30s, 6 chiffres, SHA-1 — le standard de facto malgré RFC 6238 qui
 * autorise SHA-256/512).
 */
@Service
public class TotpService {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int CODE_DIGITS = 6;
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    public String generateSecret() {
        byte[] raw = new byte[20]; // 160 bits, recommandation RFC 4226
        new SecureRandom().nextBytes(raw);
        return base32Encode(raw);
    }

    public String otpauthUri(String secret, String accountEmail, String issuer) {
        String label = urlEncode(issuer) + ":" + urlEncode(accountEmail);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + urlEncode(issuer)
                + "&digits=" + CODE_DIGITS
                + "&period=" + TIME_STEP_SECONDS;
    }

    /** Tolère un décalage d'une période avant/après (horloges client/serveur jamais parfaitement synchrones). */
    public boolean verify(String secret, String code) {
        if (code == null || !code.matches("\\d{6}")) {
            return false;
        }
        long currentStep = System.currentTimeMillis() / 1000 / TIME_STEP_SECONDS;
        byte[] key = base32Decode(secret);
        for (long step = currentStep - 1; step <= currentStep + 1; step++) {
            if (code.equals(generateCode(key, step))) {
                return true;
            }
        }
        return false;
    }

    private String generateCode(byte[] key, long step) {
        try {
            byte[] stepBytes = ByteBuffer.allocate(8).putLong(step).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(stepBytes);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % 1_000_000;
            return String.format(Locale.ROOT, "%06d", otp);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute TOTP code", e);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int bits = 0, value = 0;
        for (byte b : data) {
            value = (value << 8) | (b & 0xFF);
            bits += 8;
            while (bits >= 5) {
                sb.append(BASE32_ALPHABET.charAt((value >>> (bits - 5)) & 0x1F));
                bits -= 5;
            }
        }
        if (bits > 0) {
            sb.append(BASE32_ALPHABET.charAt((value << (5 - bits)) & 0x1F));
        }
        return sb.toString();
    }

    private byte[] base32Decode(String encoded) {
        String clean = encoded.trim().toUpperCase(Locale.ROOT).replace("=", "");
        int bits = 0, value = 0, index = 0;
        byte[] out = new byte[clean.length() * 5 / 8];
        for (char c : clean.toCharArray()) {
            int idx = BASE32_ALPHABET.indexOf(c);
            if (idx < 0) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                out[index++] = (byte) ((value >>> (bits - 8)) & 0xFF);
                bits -= 8;
            }
        }
        return out;
    }

    private String urlEncode(String s) {
        return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
    }
}
