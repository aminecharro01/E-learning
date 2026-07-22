package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.dto.admin.*;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.AdminService;
import ma.iatacademy.api.service.AppSettingsService;
import ma.iatacademy.api.service.QuizSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final QuizSettingsService quizSettingsService;
    private final AppSettingsService appSettingsService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<AdminStatsResponse> stats() {
        return ResponseEntity.ok(adminService.stats());
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> users() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @GetMapping("/users/paged")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponse<UserResponse>> usersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(adminService.listUsersPaged(page, size, q));
    }

    @GetMapping("/learners")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<PageResponse<LearnerSummaryResponse>> learners(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(adminService.listLearners(page, size, q));
    }

    @GetMapping("/learners/{id}/progress")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LearnerProgressDetailResponse> learnerProgress(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.getLearnerProgress(id));
    }

    @GetMapping("/settings/quiz")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuizSettingsResponse> getQuizSettings() {
        return ResponseEntity.ok(quizSettingsService.get());
    }

    @PutMapping("/settings/quiz")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuizSettingsResponse> updateQuizSettings(
            @Valid @RequestBody QuizSettingsRequest request
    ) {
        return ResponseEntity.ok(quizSettingsService.update(request));
    }

    @GetMapping("/settings/app")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppSettingsResponse> getAppSettings() {
        return ResponseEntity.ok(appSettingsService.get());
    }

    @PutMapping("/settings/app")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AppSettingsResponse> updateAppSettings(
            @Valid @RequestBody AppSettingsRequest request
    ) {
        return ResponseEntity.ok(appSettingsService.update(request));
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        return ResponseEntity.ok(adminService.updateRole(id, request.role()));
    }

    @PatchMapping("/users/{id}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> setEnabled(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEnabledRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(adminService.setEnabled(id, request.enabled(), principal.getId()));
    }

    @PatchMapping("/users/{id}/year2-access")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> setYear2Access(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateYear2AccessRequest request
    ) {
        return ResponseEntity.ok(adminService.setYear2Access(id, request.year2AccessEnabled()));
    }

    @PatchMapping("/users/{id}/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUserProfile(
            @PathVariable UUID id,
            @Valid @RequestBody ma.iatacademy.api.dto.UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(adminService.updateUserProfile(id, request));
    }

    @PostMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResetPasswordResponse> resetPassword(@PathVariable UUID id) {
        return ResponseEntity.ok(adminService.resetPassword(id));
    }

    @PostMapping("/users/{userId}/unlock-module/{moduleId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> unlockModule(
            @PathVariable UUID userId,
            @PathVariable UUID moduleId
    ) {
        return ResponseEntity.ok(adminService.unlockModule(userId, moduleId));
    }

    @PostMapping("/year2/open-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> openYear2ForAll() {
        return ResponseEntity.ok(adminService.openYear2ForAllEnabledLearners());
    }

    @GetMapping("/diplomas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DiplomaReadyResponse>> diplomas() {
        return ResponseEntity.ok(adminService.listDiplomas());
    }

    @PatchMapping("/diplomas/{id}/delivered")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DiplomaReadyResponse> markDiplomaDelivered(
            @PathVariable UUID id,
            @Valid @RequestBody MarkDiplomaDeliveredRequest request
    ) {
        return ResponseEntity.ok(adminService.markDiplomaDelivered(id, request.delivered(), request.note()));
    }
}
