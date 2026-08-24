package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.job.CreateJobOfferRequest;
import ma.iatacademy.api.dto.job.JobOfferResponse;
import ma.iatacademy.api.dto.job.UpdateJobOfferRequest;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.JobOfferService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class JobOfferController {

    private final JobOfferService jobOfferService;

    @GetMapping("/api/admin/job-offers")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<JobOfferResponse>> listAll() {
        return ResponseEntity.ok(jobOfferService.listAll());
    }

    @PostMapping("/api/admin/job-offers")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<JobOfferResponse> create(
            @Valid @RequestBody CreateJobOfferRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobOfferService.create(request, principal.getId()));
    }

    @PutMapping("/api/admin/job-offers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<JobOfferResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateJobOfferRequest request
    ) {
        return ResponseEntity.ok(jobOfferService.update(id, request));
    }

    @DeleteMapping("/api/admin/job-offers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> delete(@PathVariable UUID id) {
        jobOfferService.delete(id);
        return ResponseEntity.ok(new MessageResponse("Offre supprimée."));
    }

    @GetMapping("/api/job-offers")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<List<JobOfferResponse>> listForLearner(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(jobOfferService.listForLearner(principal.getId()));
    }
}
