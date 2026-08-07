package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.comment.CreateCommentRequest;
import ma.iatacademy.api.dto.comment.LessonCommentResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.CommentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/api/lessons/{lessonId}/comments")
    public ResponseEntity<List<LessonCommentResponse>> listByLesson(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(commentService.listByLesson(lessonId, principal));
    }

    @PostMapping("/api/lessons/{lessonId}/comments")
    public ResponseEntity<LessonCommentResponse> createOnLesson(
            @PathVariable UUID lessonId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.createOnLesson(lessonId, request, principal));
    }

    @GetMapping("/api/modules/{moduleId}/comments")
    public ResponseEntity<List<LessonCommentResponse>> listByModule(
            @PathVariable UUID moduleId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(commentService.listByModule(moduleId, principal));
    }

    @PostMapping("/api/modules/{moduleId}/comments")
    public ResponseEntity<LessonCommentResponse> createOnModule(
            @PathVariable UUID moduleId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.createOnModule(moduleId, request, principal));
    }

    @PostMapping("/api/lessons/comments/{commentId}/hide")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> hide(@PathVariable UUID commentId) {
        commentService.hide(commentId);
        return ResponseEntity.ok(new MessageResponse("Commentaire masqué."));
    }

    @PostMapping("/api/lessons/comments/{commentId}/unhide")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> unhide(@PathVariable UUID commentId) {
        commentService.unhide(commentId);
        return ResponseEntity.ok(new MessageResponse("Commentaire réaffiché."));
    }

    @PostMapping("/api/lessons/comments/{commentId}/pin")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> pin(@PathVariable UUID commentId) {
        commentService.pin(commentId, true);
        return ResponseEntity.ok(new MessageResponse("Message épinglé."));
    }

    @PostMapping("/api/lessons/comments/{commentId}/unpin")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> unpin(@PathVariable UUID commentId) {
        commentService.pin(commentId, false);
        return ResponseEntity.ok(new MessageResponse("Épinglage retiré."));
    }

    @GetMapping("/api/admin/comments/moderation")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<PageResponse<LessonCommentResponse>> moderationQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(commentService.moderationQueue(page, size));
    }
}
