package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Conversation;
import ma.iatacademy.api.domain.entity.ConversationParticipant;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.ConversationType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.messaging.ChatMessageResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.ConversationParticipantRepository;
import ma.iatacademy.api.repository.ConversationRepository;
import ma.iatacademy.api.repository.MessageRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessagingServiceTest {

    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private ConversationParticipantRepository participantRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RateLimitService rateLimitService;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private MessagingService messagingService;

    @Test
    void getOrCreateDirectRejectsSelfConversation() {
        UUID userId = UUID.randomUUID();

        assertThrows(ApiException.class, () -> messagingService.getOrCreateDirect(userId, userId));
    }

    @Test
    void getOrCreateDirectRejectsWhenNeitherUserIsStaff() {
        UUID userId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(userRepository.findById(otherId)).thenReturn(Optional.of(
                User.builder().id(otherId).role(Role.ETUDIANT).build()));

        assertThrows(ForbiddenException.class, () -> messagingService.getOrCreateDirect(userId, otherId));
    }

    @Test
    void getOrCreateDirectReturnsExistingConversationWhenPresent() {
        UUID userId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        UUID existingConversationId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(
                User.builder().id(staffId).role(Role.FORMATEUR).build()));
        when(participantRepository.findDirectConversationId(userId, staffId))
                .thenReturn(Optional.of(existingConversationId));

        UUID result = messagingService.getOrCreateDirect(userId, staffId);

        assertEquals(existingConversationId, result);
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void getOrCreateDirectCreatesNewConversationWithBothParticipants() {
        UUID userId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(
                User.builder().id(staffId).role(Role.FORMATEUR).build()));
        when(participantRepository.findDirectConversationId(userId, staffId)).thenReturn(Optional.empty());

        messagingService.getOrCreateDirect(userId, staffId);

        verify(conversationRepository, times(1)).save(any(Conversation.class));
        verify(participantRepository, times(2)).save(any(ConversationParticipant.class));
    }

    @Test
    void sendRejectsNonMemberOfDirectConversation() {
        UUID conversationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Conversation conversation = Conversation.builder().id(conversationId).type(ConversationType.DIRECT).build();
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(participantRepository.findByConversationIdAndUserId(conversationId, userId)).thenReturn(Optional.empty());
        User sender = User.builder().id(userId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(sender);

        assertThrows(ForbiddenException.class, () -> messagingService.send(conversationId, "hello", principal));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void sendRejectsCohortNonMember() {
        UUID conversationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        Conversation conversation = Conversation.builder().id(conversationId)
                .type(ConversationType.COHORT_ROOM)
                .group(LearnerGroup.builder().id(groupId).build())
                .build();
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.ETUDIANT).build()));
        User sender = User.builder().id(userId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(sender);

        assertThrows(ForbiddenException.class, () -> messagingService.send(conversationId, "hello", principal));
    }

    @Test
    void sendSucceedsForCohortMemberAndNotifiesOthers() {
        UUID conversationId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID otherMemberId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();
        LearnerGroup group = LearnerGroup.builder().id(groupId).build();
        Conversation conversation = Conversation.builder().id(conversationId)
                .type(ConversationType.COHORT_ROOM)
                .group(group)
                .build();
        User sender = User.builder().id(userId).role(Role.ETUDIANT).group(group).fullName("Sender").build();
        User other = User.builder().id(otherMemberId).role(Role.ETUDIANT).group(group).build();

        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(userId)).thenReturn(Optional.of(sender));
        when(userRepository.getReferenceById(userId)).thenReturn(sender);
        when(userRepository.findByGroupIdOrderByFullNameAsc(groupId)).thenReturn(List.of(sender, other));

        UserPrincipal principal = new UserPrincipal(sender);
        ChatMessageResponse response = messagingService.send(conversationId, "  hello team  ", principal);

        assertEquals("hello team", response.body());
        verify(messageRepository, times(1)).save(any());
        verify(rateLimitService, times(1)).checkMessageAllowed(userId.toString());
        verify(notificationService, times(1)).notify(any(), any(), any(), any(), any());
    }

    @Test
    void markReadThrowsWhenConversationMissing() {
        UUID conversationId = UUID.randomUUID();
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.empty());
        User user = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build();

        assertThrows(NotFoundException.class,
                () -> messagingService.markRead(conversationId, new UserPrincipal(user)));
    }

    @Test
    void listStaffContactsExcludesDisabledAccounts() {
        User enabledFormateur = User.builder().id(UUID.randomUUID()).role(Role.FORMATEUR)
                .fullName("Prof A").enabled(true).build();
        User disabledAdmin = User.builder().id(UUID.randomUUID()).role(Role.ADMIN)
                .fullName("Admin B").enabled(false).build();
        lenient().when(userRepository.findByRole(Role.FORMATEUR)).thenReturn(List.of(enabledFormateur));
        lenient().when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(disabledAdmin));

        var contacts = messagingService.listStaffContacts();

        assertEquals(1, contacts.size());
        assertEquals("Prof A", contacts.get(0).fullName());
    }

    @Test
    void listSupportContactsReturnsOnlyEnabledSupportUsers() {
        User enabledSupport = User.builder().id(UUID.randomUUID()).role(Role.SUPPORT)
                .fullName("Support A").enabled(true).build();
        User disabledSupport = User.builder().id(UUID.randomUUID()).role(Role.SUPPORT)
                .fullName("Support B").enabled(false).build();
        when(userRepository.findByRole(Role.SUPPORT)).thenReturn(List.of(enabledSupport, disabledSupport));

        var contacts = messagingService.listSupportContacts();

        assertEquals(1, contacts.size());
        assertEquals("Support A", contacts.get(0).fullName());
        assertEquals("SUPPORT", contacts.get(0).role());
    }

    @Test
    void getOrCreateDirectAllowsSupportEvenThoughNotStaff() {
        UUID userId = UUID.randomUUID();
        UUID supportId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(userRepository.findById(supportId)).thenReturn(Optional.of(
                User.builder().id(supportId).role(Role.SUPPORT).build()));
        when(participantRepository.findDirectConversationId(userId, supportId)).thenReturn(Optional.empty());

        messagingService.getOrCreateDirect(userId, supportId);

        verify(conversationRepository, times(1)).save(any(Conversation.class));
    }

    @Test
    void listMyConversationsIncludesAllCohortRoomsForStaff() {
        UUID staffId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        Conversation room = Conversation.builder().id(roomId).type(ConversationType.COHORT_ROOM)
                .group(LearnerGroup.builder().id(UUID.randomUUID()).name("Cohorte A").build()).build();
        User staff = User.builder().id(staffId).role(Role.FORMATEUR).build();
        UserPrincipal principal = new UserPrincipal(staff);

        when(participantRepository.findByUserIdOrderByCreatedAtDesc(staffId)).thenReturn(List.of());
        when(conversationRepository.findByType(ConversationType.COHORT_ROOM)).thenReturn(List.of(room));
        when(messageRepository.findLastMessagePerConversation(List.of(roomId))).thenReturn(List.of());
        when(messageRepository.countUnreadPerConversation(List.of(roomId), staffId)).thenReturn(List.of());

        var conversations = messagingService.listMyConversations(principal);

        assertEquals(1, conversations.size());
        assertEquals(roomId, conversations.get(0).id());
    }
}
