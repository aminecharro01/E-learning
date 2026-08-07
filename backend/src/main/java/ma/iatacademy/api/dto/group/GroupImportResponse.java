package ma.iatacademy.api.dto.group;

import java.util.List;
import java.util.UUID;

public record GroupImportResponse(
        UUID groupId,
        String groupName,
        int importedCount,
        String defaultPassword,
        List<RowError> errors
) {
    /** Ligne rejetée : le reste de l'import est conservé (pas de tout-ou-rien). */
    public record RowError(int rowNumber, String reason) {
    }
}
