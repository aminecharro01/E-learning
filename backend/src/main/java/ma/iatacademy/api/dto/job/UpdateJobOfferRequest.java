package ma.iatacademy.api.dto.job;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.iatacademy.api.domain.enums.ContractType;

import java.time.Instant;

public record UpdateJobOfferRequest(
        @NotBlank String title,
        @NotBlank String company,
        @NotBlank String description,
        String location,
        @NotNull ContractType contractType,
        String applyUrl,
        String contactEmail,
        boolean published,
        Instant expiresAt
) {
}
