package ma.iatacademy.api.dto.admin;

import jakarta.validation.constraints.NotNull;

public record MarkDiplomaDeliveredRequest(
        @NotNull Boolean delivered,
        String note
) {
}
