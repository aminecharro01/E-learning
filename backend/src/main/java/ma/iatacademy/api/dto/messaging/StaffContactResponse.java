package ma.iatacademy.api.dto.messaging;

import java.util.UUID;

public record StaffContactResponse(UUID id, String fullName, String role) {
}
