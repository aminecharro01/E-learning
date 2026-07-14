package ma.iatacademy.api.dto.catalog;

import java.util.List;
import java.util.UUID;

public record FormationResponse(
        UUID id,
        String title,
        String description,
        boolean published,
        List<ModuleSummaryResponse> modules
) {
}
