package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.assignment.AssignmentResponse;
import ma.iatacademy.api.dto.assignment.CreateAssignmentRequest;
import ma.iatacademy.api.dto.assignment.GradeSubmissionRequest;
import ma.iatacademy.api.dto.assignment.LearnerAssignmentResponse;
import ma.iatacademy.api.dto.assignment.SubmissionResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.AssignmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping("/api/admin/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<AssignmentResponse> create(
            @Valid @RequestBody CreateAssignmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(request, principal.getId()));
    }

    @GetMapping("/api/modules/{moduleId}/assignments")
    public ResponseEntity<List<AssignmentResponse>> listByModule(@PathVariable UUID moduleId) {
        return ResponseEntity.ok(assignmentService.listByModule(moduleId));
    }

    /** Vue apprenant : mêmes devoirs, mais avec le statut/note de son propre dépôt. */
    @GetMapping("/api/modules/{moduleId}/assignments/mine")
    public ResponseEntity<List<LearnerAssignmentResponse>> listMine(
            @PathVariable UUID moduleId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(assignmentService.listByModuleForLearner(moduleId, principal.getId()));
    }

    @DeleteMapping("/api/admin/assignments/{assignmentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> delete(@PathVariable UUID assignmentId) {
        assignmentService.delete(assignmentId);
        return ResponseEntity.ok(new MessageResponse("Devoir supprimé."));
    }

    @PostMapping(value = "/api/assignments/{assignmentId}/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<SubmissionResponse> submit(
            @PathVariable UUID assignmentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(assignmentService.submit(assignmentId, file, principal));
    }

    @GetMapping("/api/admin/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<SubmissionResponse>> listSubmissions(@PathVariable UUID assignmentId) {
        return ResponseEntity.ok(assignmentService.listSubmissions(assignmentId));
    }

    @PatchMapping("/api/admin/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> gradeSubmission(
            @PathVariable UUID submissionId,
            @Valid @RequestBody GradeSubmissionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        assignmentService.gradeSubmission(submissionId, request, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Devoir corrigé."));
    }
}
