package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.note.LessonNoteRequest;
import ma.iatacademy.api.dto.note.LessonNoteResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.LessonNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LessonNoteController {

    private final LessonNoteService lessonNoteService;

    @GetMapping("/api/lessons/{lessonId}/notes")
    public ResponseEntity<List<LessonNoteResponse>> list(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonNoteService.listMine(lessonId, principal.getId()));
    }

    @PostMapping("/api/lessons/{lessonId}/notes")
    public ResponseEntity<LessonNoteResponse> create(
            @PathVariable UUID lessonId,
            @Valid @RequestBody LessonNoteRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonNoteService.create(lessonId, principal.getId(), request.body()));
    }

    @PutMapping("/api/lessons/notes/{noteId}")
    public ResponseEntity<LessonNoteResponse> update(
            @PathVariable UUID noteId,
            @Valid @RequestBody LessonNoteRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonNoteService.update(noteId, principal.getId(), request.body()));
    }

    @DeleteMapping("/api/lessons/notes/{noteId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        lessonNoteService.delete(noteId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
