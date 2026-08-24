package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.messaging.ChatMessageResponse;
import ma.iatacademy.api.dto.messaging.ConversationResponse;
import ma.iatacademy.api.dto.messaging.SendMessageRequest;
import ma.iatacademy.api.dto.messaging.StaffContactResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.MessagingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> list(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(messagingService.listMyConversations(principal));
    }

    /** Annuaire staff pour permettre à un apprenant de démarrer lui-même une conversation. */
    @GetMapping("/staff")
    public ResponseEntity<List<StaffContactResponse>> listStaffContacts() {
        return ResponseEntity.ok(messagingService.listStaffContacts());
    }

    @PostMapping("/direct/{otherUserId}")
    public ResponseEntity<Map<String, UUID>> getOrCreateDirect(
            @PathVariable UUID otherUserId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID id = messagingService.getOrCreateDirect(principal.getId(), otherUserId);
        return ResponseEntity.ok(Map.of("conversationId", id));
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> listMessages(
            @PathVariable UUID conversationId,
            @RequestParam(required = false) Instant since,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(messagingService.listMessages(conversationId, since, principal));
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<ChatMessageResponse> send(
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(messagingService.send(conversationId, request.body(), principal));
    }

    @PostMapping("/{conversationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        messagingService.markRead(conversationId, principal);
        return ResponseEntity.noContent().build();
    }
}
