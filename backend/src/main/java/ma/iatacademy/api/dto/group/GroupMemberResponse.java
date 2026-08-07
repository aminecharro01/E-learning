package ma.iatacademy.api.dto.group;

import java.util.UUID;

public record GroupMemberResponse(
        UUID id,
        String fullName,
        String email,
        String matricule,
        boolean enabled,
        boolean profileCompleted
) {
}
