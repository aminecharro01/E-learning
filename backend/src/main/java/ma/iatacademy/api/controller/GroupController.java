package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.group.AssignContentRequest;
import ma.iatacademy.api.dto.group.AssignmentResponse;
import ma.iatacademy.api.dto.group.CreateGroupRequest;
import ma.iatacademy.api.dto.group.GroupImportResponse;
import ma.iatacademy.api.dto.group.GroupMemberResponse;
import ma.iatacademy.api.dto.group.GroupResponse;
import ma.iatacademy.api.dto.group.LeaderboardEntryResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.GroupContentService;
import ma.iatacademy.api.service.GroupImportService;
import ma.iatacademy.api.service.GroupService;
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
@RequestMapping("/api/admin/groups")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class GroupController {

    private final GroupService groupService;
    private final GroupImportService groupImportService;
    private final GroupContentService groupContentService;

    @GetMapping
    public ResponseEntity<List<GroupResponse>> list() {
        return ResponseEntity.ok(groupService.list());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<GroupImportResponse> importGroup(
            @RequestParam("name") String name,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupImportService.importGroup(name, file, principal.getId()));
    }

    @PostMapping
    public ResponseEntity<GroupResponse> create(
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(groupService.create(request, principal.getId()));
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<List<GroupMemberResponse>> members(@PathVariable UUID groupId) {
        return ResponseEntity.ok(groupService.listMembers(groupId));
    }

    @PostMapping("/{groupId}/members/{userId}")
    public ResponseEntity<MessageResponse> addMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        groupService.addExistingMember(groupId, userId, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Apprenant ajouté au groupe."));
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public ResponseEntity<MessageResponse> removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        groupService.removeMember(groupId, userId, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Apprenant retiré du groupe."));
    }

    @GetMapping("/{groupId}/assignments")
    public ResponseEntity<List<AssignmentResponse>> assignments(@PathVariable UUID groupId) {
        return ResponseEntity.ok(groupContentService.list(groupId));
    }

    @PostMapping("/{groupId}/assignments")
    public ResponseEntity<List<AssignmentResponse>> assign(
            @PathVariable UUID groupId,
            @Valid @RequestBody AssignContentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(groupContentService.assign(groupId, request, principal.getId()));
    }

    @DeleteMapping("/{groupId}/assignments/{assignmentId}")
    public ResponseEntity<MessageResponse> revoke(
            @PathVariable UUID groupId,
            @PathVariable UUID assignmentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        groupContentService.revoke(groupId, assignmentId, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Affectation retirée."));
    }

    /** Ouvert à tout membre authentifié de la cohorte (pas seulement ADMIN) — filtré côté service. */
    @GetMapping("/{groupId}/leaderboard")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<LeaderboardEntryResponse>> leaderboard(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(groupService.leaderboard(groupId, principal));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<MessageResponse> delete(
            @PathVariable UUID groupId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        groupService.delete(groupId, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Groupe supprimé."));
    }
}
