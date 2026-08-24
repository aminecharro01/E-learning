package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Conversation;
import ma.iatacademy.api.domain.entity.ConversationParticipant;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.Message;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.ConversationType;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.messaging.ChatMessageResponse;
import ma.iatacademy.api.dto.messaging.ConversationResponse;
import ma.iatacademy.api.dto.messaging.StaffContactResponse;
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
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RateLimitService rateLimitService;
    private final NotificationService notificationService;

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

    /** Formateurs + Directeur — pour permettre à un apprenant sans cohorte (donc sans
     * salon commun) de démarrer lui-même une conversation, au lieu d'attendre que le
     * staff l'initie. */
    @Transactional(readOnly = true)
    public List<StaffContactResponse> listStaffContacts() {
        return java.util.stream.Stream.concat(
                        userRepository.findByRole(Role.FORMATEUR).stream(),
                        userRepository.findByRole(Role.ADMIN).stream())
                .filter(User::isEnabled)
                .sorted(Comparator.comparing(u -> u.getFullName() != null ? u.getFullName() : u.getEmail()))
                .map(u -> new StaffContactResponse(
                        u.getId(),
                        u.getFullName() != null ? u.getFullName() : u.getEmail(),
                        u.getRole().name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> listMyConversations(UserPrincipal principal) {
        List<Conversation> direct = participantRepository.findByUserIdOrderByCreatedAtDesc(principal.getId()).stream()
                .map(ConversationParticipant::getConversation)
                .toList();

        List<Conversation> cohortRooms = principal.getRole() == Role.ETUDIANT
                ? userRepository.findById(principal.getId())
                        .map(User::getGroup)
                        .flatMap(g -> g != null ? conversationRepository.findByGroupId(g.getId()) : java.util.Optional.<Conversation>empty())
                        .map(List::of)
                        .orElse(List.of())
                : List.of();

        List<Conversation> conversations = java.util.stream.Stream.concat(direct.stream(), cohortRooms.stream())
                .distinct()
                .toList();
        if (conversations.isEmpty()) {
            return List.of();
        }

        // Batched instead of one query per conversation: two round trips total, no matter
        // how many conversations the user has (was ~3 queries × N conversations before).
        List<UUID> ids = conversations.stream().map(Conversation::getId).toList();
        Map<UUID, Message> lastMessageByConversation = messageRepository.findLastMessagePerConversation(ids).stream()
                .collect(java.util.stream.Collectors.toMap(m -> m.getConversation().getId(), m -> m));
        Map<UUID, Long> unreadByConversation = messageRepository.countUnreadPerConversation(ids, principal.getId()).stream()
                .collect(java.util.stream.Collectors.toMap(
                        MessageRepository.ConversationUnreadCount::getConversationId,
                        MessageRepository.ConversationUnreadCount::getUnreadCount));

        return conversations.stream()
                .map(c -> toResponse(c, principal.getId(), lastMessageByConversation.get(c.getId()),
                        unreadByConversation.getOrDefault(c.getId(), 0L)))
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
        notifyRecipients(conversation, message, principal.getId());
        return toResponse(message);
    }

    /** Marque la conversation comme lue par l'utilisateur courant (remet son compteur de non-lus à zéro). */
    @Transactional
    public void markRead(UUID conversationId, UserPrincipal principal) {
        assertAccess(conversationId, principal);
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserId(conversationId, principal.getId())
                .orElseGet(() -> ConversationParticipant.builder()
                        .conversation(conversationRepository.getReferenceById(conversationId))
                        .user(userRepository.getReferenceById(principal.getId()))
                        .build());
        participant.setLastReadAt(Instant.now());
        participantRepository.save(participant);
    }

    /** Notifie tout le monde sauf l'auteur — les autres participants pour une conversation
     * directe, tous les membres de la cohorte pour un salon (le staff n'y a pas de ligne
     * ConversationParticipant : son accès passe par le rôle, pas par l'appartenance). */
    private void notifyRecipients(Conversation conversation, Message message, UUID senderId) {
        User sender = message.getSender();
        String senderName = sender.getFullName() != null ? sender.getFullName() : sender.getEmail();
        String body = message.getBody();
        String preview = body.length() > 80 ? body.substring(0, 77) + "…" : body;
        for (User recipient : resolveRecipients(conversation, senderId)) {
            String link = recipient.getRole().isStaff() ? "/admin/messages" : "/app/messages";
            notificationService.notify(recipient, NotificationType.NEW_MESSAGE, "Message de " + senderName, preview, link);
        }
    }

    private List<User> resolveRecipients(Conversation conversation, UUID senderId) {
        if (conversation.getType() == ConversationType.COHORT_ROOM) {
            if (conversation.getGroup() == null) return List.of();
            return userRepository.findByGroupIdOrderByFullNameAsc(conversation.getGroup().getId()).stream()
                    .filter(u -> !u.getId().equals(senderId))
                    .toList();
        }
        return conversation.getParticipants().stream()
                .map(ConversationParticipant::getUser)
                .filter(u -> !u.getId().equals(senderId))
                .toList();
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

    private ConversationResponse toResponse(Conversation c, UUID viewerId, Message last, long unreadCount) {
        String title = c.getType() == ConversationType.COHORT_ROOM
                ? "Salon — " + (c.getGroup() != null ? c.getGroup().getName() : "Cohorte")
                : c.getParticipants().stream()
                        .map(ConversationParticipant::getUser)
                        .filter(u -> !u.getId().equals(viewerId))
                        .map(u -> u.getFullName() != null ? u.getFullName() : u.getEmail())
                        .findFirst().orElse("Conversation");
        return new ConversationResponse(c.getId(), c.getType(), title,
                last != null ? last.getBody() : null, last != null ? last.getCreatedAt() : null, unreadCount);
    }

    private ChatMessageResponse toResponse(Message m) {
        User sender = m.getSender();
        return new ChatMessageResponse(m.getId(), sender.getId(),
                sender.getFullName() != null ? sender.getFullName() : sender.getEmail(),
                m.getBody(), m.getCreatedAt());
    }
}
