package ma.iatacademy.api.dto.badge;

import java.time.Instant;

/** Réponse publique et non authentifiée — voir CertificateResponse pour le même principe côté diplôme. */
public record PublicBadgeResponse(
        String shareCode,
        String badgeCode,
        String label,
        String description,
        String icon,
        String learnerName,
        Instant awardedAt
) {
}
