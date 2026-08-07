package ma.iatacademy.api.dto.stage;

import jakarta.validation.constraints.Size;

public record SignOffRequest(
        @Size(max = 1000) String note
) {
}
