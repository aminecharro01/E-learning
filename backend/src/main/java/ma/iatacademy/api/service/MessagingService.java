package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Conversation;
import ma.iatacademy.api.domain.entity.ConversationParticipant;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.Message;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.ConversationType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.messaging.ChatMessageResponse;
import ma.iatacademy.api.dto.messaging.ConversationResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.ConversationParticipantRepository;
import ma.iatacademy.api.repository.ConversationRepository;
import ma.iatacademy.api.repository.MessageRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RateLimitService rateLimitService;

    /** Créée automatiquement à la création d'une cohorte (GroupService#create). */
    @Transactional
    public void createCohortRoom(LearnerGroup group) {
        Conversation conversation = Conversation.builder().type(ConversationType.COHORT_ROOM).group(group).build();
        conversationRepository.save(conversation);
    }

    /** Élève <-> staff uniquement (pas élève <-> élève) — récupère la conversation existante ou en crée une. */
    @Transactional
    public UUID getOrCreateDirect(UUID userId, UUID otherUserId) {
        if (userId.equals(otherUserId)) {
            throw new ApiException("Impossible de démarrer une conversation avec soi-même.");
        }
        User a = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        User b = userRepository.findById(otherUserId).orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (!a.getRole().isStaff() && !b.getRole().isStaff()) {
            throw new ForbiddenException("La messagerie directe est réservée aux échanges élève ↔ formateur.");
        }
        return participantRepository.findDirectConversationId(userId, otherUserId)
                .orElseGet(() -> {
                    Conversation conversation = Conversation.builder().type(ConversationType.DIRECT).build();
                    conversationRepository.save(conversation);
                    participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(a).build());
                    participantRepository.save(ConversationParticipant.builder().conversation(conversation).user(b).build());
                    return conversation.getId();
                });
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> listMyConversations(UserPrincipal principal) {
        List<ConversationResponse> direct = participantRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(cp -> toResponse(cp.getConversation(), principal.getId()))
                .toList();

        List<ConversationResponse> cohortRooms = principal.getRole() == Role.ETUDIANT
                ? userRepository.findById(principal.getId())
                        .map(User::getGroup)
                        .flatMap(g -> g != null ? conversationRepository.findByGroupId(g.getId()) : java.util.Optional.<Conversation>empty())
                        .map(c -> toResponse(c, principal.getId()))
                        .map(List::of)
                        .orElse(List.of())
                : List.of();

        return java.util.stream.Stream.concat(direct.stream(), cohortRooms.stream())
                .distinct()
                .sorted(Comparator.comparing(ConversationResponse::lastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> listMessages(UUID conversationId, Instant since, UserPrincipal principal) {
        assertAccess(conversationId, principal);
        List<Message> messages = since != null
                ? messageRepository.findByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(conversationId, since)
                : messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ChatMessageResponse send(UUID conversationId, String body, UserPrincipal principal) {
        assertAccess(conversationId, principal);
        rateLimitService.checkMessageAllowed(principal.getId().toString());
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable."));
        Message message = Message.builder()
                .conversation(conversation)
                .sender(userRepository.getReferenceById(principal.getId()))
                .body(body.trim())
                .build();
        messageRepository.save(message);
        return toResponse(message);
    }

    private void assertAccess(UUID conversationId, UserPrincipal principal) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundException("Conversation introuvable."));
        if (conversation.getType() == ConversationType.COHORT_ROOM) {
            if (principal.getRole().isStaff()) return;
            User user = userRepository.findById(principal.getId()).orElse(null);
            boolean member = user != null && user.getGroup() != null
                    && conversation.getGroup() != null && user.getGroup().getId().equals(conversation.getGroup().getId());
            if (!member) throw new ForbiddenException("Vous n'appartenez pas à cette cohorte.");
            return;
        }
        participantRepository.findByConversationIdAndUserId(conversationId, principal.getId())
                .orElseThrow(() -> new ForbiddenException("Cette conversation ne vous appartient pas."));
    }

    private ConversationResponse toResponse(Conversation c, UUID viewerId) {
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(c.getId());
        Message last = messages.isEmpty() ? null : messages.get(messages.size() - 1);
        String title = c.getType() == ConversationType.COHORT_ROOM
                ? "Salon — " + (c.getGroup() != null ? c.getGroup().getName() : "Cohorte")
                : c.getParticipants().stream()
                        .map(ConversationParticipant::getUser)
                        .filter(u -> !u.getId().equals(viewerId))
                        .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .findFirst().orElse("Conversation");
        return new ConversationResponse(c.getId(), c.getType(), title,
                last != null ? last.getBody() : null, last != null ? last.getCreatedAt() : null);
    }

    private ChatMessageResponse toResponse(Message m) {
        User sender = m.getSender();
        return new ChatMessageResponse(m.getId(), sender.getId(),
                sender.getFullName() != null ? sender.getFullName() : sender.getEmail(),
                m.getBody(), m.getCreatedAt());
    }
}
