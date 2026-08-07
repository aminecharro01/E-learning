package ma.iatacademy.api.dto.publicapi;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NewsletterSubscribeRequest(
        @NotBlank @Email @Size(max = 255) String email
) {
}
