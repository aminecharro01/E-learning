package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.lesson.*;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.LessonLockService;
import ma.iatacademy.api.service.LessonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;
    private final LessonLockService lessonLockService;

    @GetMapping("/{id}")
    public ResponseEntity<LessonDetailResponse> getLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonService.getLesson(id, principal));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LessonDetailResponse> updateLesson(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLessonRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonService.updateLesson(id, request, principal.getId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> deleteLesson(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        lessonService.deleteLesson(id, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Section supprimée."));
    }

    @GetMapping("/{id}/blocks")
    public ResponseEntity<List<BlockResponse>> listBlocks(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonService.listBlocks(id, principal));
    }

    @PostMapping("/{id}/blocks")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<BlockResponse> createBlock(
            @PathVariable UUID id,
            @Valid @RequestBody CreateBlockRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(lessonService.createBlock(id, request, principal.getId()));
    }

    @PutMapping("/{id}/blocks/{blockId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<BlockResponse> updateBlock(
            @PathVariable UUID id,
            @PathVariable UUID blockId,
            @Valid @RequestBody UpdateBlockRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonService.updateBlock(id, blockId, request, principal.getId()));
    }

    @DeleteMapping("/{id}/blocks/{blockId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> deleteBlock(
            @PathVariable UUID id,
            @PathVariable UUID blockId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        lessonService.deleteBlock(id, blockId, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Bloc supprimé."));
    }

    @PatchMapping("/{id}/blocks")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<BlockResponse>> reorderBlocks(
            @PathVariable UUID id,
            @Valid @RequestBody List<ReorderBlockItem> items,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonService.reorderBlocks(id, items, principal.getId()));
    }

    @PostMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LessonLockResponse> acquireLock(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonLockService.acquire(id, principal.getId()));
    }

    @PatchMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LessonLockResponse> renewLock(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(lessonLockService.renew(id, principal.getId()));
    }

    @DeleteMapping("/{id}/lock")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> releaseLock(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        lessonLockService.release(id, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Verrou libéré."));
    }
}
