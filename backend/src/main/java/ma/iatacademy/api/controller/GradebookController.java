package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.assignment.CreateGradeAdjustmentRequest;
import ma.iatacademy.api.dto.gradebook.GradebookResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.GradebookService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/gradebook")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
public class GradebookController {

    private final GradebookService gradebookService;

    @GetMapping("/modules/{moduleId}")
    public ResponseEntity<GradebookResponse> get(@PathVariable UUID moduleId) {
        return ResponseEntity.ok(gradebookService.build(moduleId));
    }

    @PostMapping("/adjustments")
    public ResponseEntity<MessageResponse> addAdjustment(
            @Valid @RequestBody CreateGradeAdjustmentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        gradebookService.addAdjustment(request, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Bonus/malus ajouté."));
    }
}
