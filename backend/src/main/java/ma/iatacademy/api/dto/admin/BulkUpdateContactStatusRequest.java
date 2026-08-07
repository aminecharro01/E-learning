package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;
import java.util.UUID;

public record BulkUpdateContactStatusRequest(
        @NotEmpty List<UUID> ids,
        @NotBlank
        @Pattern(regexp = "NEW|READ|ARCHIVED", message = "Statut invalide (NEW, READ, ARCHIVED)")
        String status
) {
}
