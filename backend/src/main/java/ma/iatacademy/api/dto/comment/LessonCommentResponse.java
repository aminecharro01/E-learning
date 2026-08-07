package ma.iatacademy.api.dto.comment;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LessonCommentResponse(
        UUID id,
        UUID lessonId,
        UUID moduleId,
        UUID parentId,
        UUID authorId,
        String authorName,
        boolean authorStaff,
        String body,
        boolean hidden,
        boolean pinned,
        Instant createdAt,
        List<LessonCommentResponse> replies
) {
}
