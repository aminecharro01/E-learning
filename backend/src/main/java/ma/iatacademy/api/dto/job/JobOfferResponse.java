package ma.iatacademy.api.dto.job;

import ma.iatacademy.api.domain.enums.ContractType;

import java.time.Instant;
import java.util.UUID;

public record JobOfferResponse(
        UUID id,
        String title,
        String company,
        String description,
        String location,
        ContractType contractType,
        String applyUrl,
        String contactEmail,
        UUID photoAssetId,
        boolean published,
        Instant expiresAt,
        Instant createdAt
) {
}
