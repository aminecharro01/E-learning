package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.session.CreateVirtualSessionRequest;
import ma.iatacademy.api.dto.session.VirtualSessionResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.VirtualSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class VirtualSessionController {

    private final VirtualSessionService virtualSessionService;

    @PostMapping("/api/admin/sessions")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<VirtualSessionResponse> create(
            @Valid @RequestBody CreateVirtualSessionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(virtualSessionService.create(request, principal.getId()));
    }

    @GetMapping("/api/groups/{groupId}/sessions")
    public ResponseEntity<List<VirtualSessionResponse>> listByGroup(@PathVariable UUID groupId) {
        return ResponseEntity.ok(virtualSessionService.listByGroup(groupId));
    }

    @DeleteMapping("/api/admin/sessions/{sessionId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> delete(@PathVariable UUID sessionId) {
        virtualSessionService.delete(sessionId);
        return ResponseEntity.ok(new MessageResponse("Session supprimée."));
    }
}
