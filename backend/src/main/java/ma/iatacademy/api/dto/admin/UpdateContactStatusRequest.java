package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateContactStatusRequest(
        @NotBlank
        @Pattern(regexp = "NEW|READ|ARCHIVED", message = "Statut invalide (NEW, READ, ARCHIVED)")
        String status
) {
}
