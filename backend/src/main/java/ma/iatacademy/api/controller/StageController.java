package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.stage.LearnerDocumentResponse;
import ma.iatacademy.api.dto.stage.LearnerDossierResponse;
import ma.iatacademy.api.dto.stage.UfValidationResponse;
import ma.iatacademy.api.dto.stage.UploadLearnerDocumentRequest;
import ma.iatacademy.api.dto.stage.ValidateUfRequest;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.StageService;
import ma.iatacademy.api.service.UfValidationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stage")
@RequiredArgsConstructor
public class StageController {

    private final StageService stageService;
    private final UfValidationService ufValidationService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<LearnerDossierResponse> myDossier(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(stageService.getMyDossier(principal));
    }

    @GetMapping("/learners")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<LearnerDossierResponse>> listDossiers() {
        return ResponseEntity.ok(stageService.listDossiers());
    }

    @GetMapping("/learners/{learnerId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LearnerDossierResponse> getDossier(
            @PathVariable UUID learnerId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(stageService.getDossier(learnerId, principal));
    }

    @PostMapping("/learners/{learnerId}/documents")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR','ETUDIANT')")
    public ResponseEntity<LearnerDocumentResponse> upload(
            @PathVariable UUID learnerId,
            @Valid @RequestBody UploadLearnerDocumentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stageService.upload(learnerId, request, principal));
    }

    @PostMapping("/me/documents")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<LearnerDocumentResponse> uploadMine(
            @Valid @RequestBody UploadLearnerDocumentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stageService.upload(principal.getId(), request, principal));
    }

    @DeleteMapping("/documents/{documentId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR','ETUDIANT')")
    public ResponseEntity<MessageResponse> delete(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        stageService.deleteDocument(documentId, principal);
        return ResponseEntity.ok(new MessageResponse("Document supprimé."));
    }

    @GetMapping("/learners/{learnerId}/uf-validations")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR','ETUDIANT')")
    public ResponseEntity<List<UfValidationResponse>> ufValidations(
            @PathVariable UUID learnerId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal.getRole().name().equals("ETUDIANT") && !principal.getId().equals(learnerId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(ufValidationService.listForLearner(learnerId));
    }

    @GetMapping("/me/uf-validations")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<List<UfValidationResponse>> myUfValidations(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ufValidationService.listForLearner(principal.getId()));
    }

    @PostMapping("/learners/{learnerId}/uf-validations")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<UfValidationResponse> validateUf(
            @PathVariable UUID learnerId,
            @Valid @RequestBody ValidateUfRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ufValidationService.validate(learnerId, request, principal));
    }
}
