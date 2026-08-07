package ma.iatacademy.api.dto.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateCommentRequest(
        @NotBlank @Size(max = 2000) String body,
        /** Non-null = cette entrée est une réponse au commentaire ciblé (le fil hérite de sa leçon/module). */
        UUID parentId
) {
}
