package ma.iatacademy.api.dto.agenda;

import java.time.Instant;

public record AgendaItemResponse(
        String type,
        String label,
        Instant at,
        String link
) {
}
