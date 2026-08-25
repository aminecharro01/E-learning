package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.group.CreateGroupRequest;
import ma.iatacademy.api.dto.group.GroupResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LearnerGroupRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private LearnerGroupRepository groupRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private QuizAttemptRepository quizAttemptRepository;
    @Mock
    private MessagingService messagingService;

    @InjectMocks
    private GroupService groupService;

    @Test
    void createRejectsDuplicateName() {
        CreateGroupRequest request = new CreateGroupRequest("Promo 2026", null, null, null, null);
        when(groupRepository.existsByNameIgnoreCase("Promo 2026")).thenReturn(true);

        assertThrows(ApiException.class, () -> groupService.create(request, UUID.randomUUID()));
        verify(groupRepository, never()).save(any());
    }

    @Test
    void createRejectsDuplicateCode() {
        CreateGroupRequest request = new CreateGroupRequest("Promo 2027", "P27", null, null, null);
        when(groupRepository.existsByNameIgnoreCase("Promo 2027")).thenReturn(false);
        when(groupRepository.existsByCodeIgnoreCase("P27")).thenReturn(true);

        assertThrows(ApiException.class, () -> groupService.create(request, UUID.randomUUID()));
        verify(groupRepository, never()).save(any());
    }

    @Test
    void createSavesGroupAndCreatesCohortRoom() {
        CreateGroupRequest request = new CreateGroupRequest("Promo 2028", null, null, null, null);
        when(groupRepository.existsByNameIgnoreCase("Promo 2028")).thenReturn(false);
        when(userRepository.getReferenceById(any())).thenReturn(User.builder().id(UUID.randomUUID()).build());
        when(userRepository.countByGroupId(any())).thenReturn(0L);

        GroupResponse response = groupService.create(request, UUID.randomUUID());

        assertEquals("Promo 2028", response.name());
        verify(groupRepository, times(1)).save(any(LearnerGroup.class));
        verify(messagingService, times(1)).createCohortRoom(any(LearnerGroup.class));
        verify(auditLogService, times(1)).record(any(), eq("GROUP_CREATED"), any(), any(), any());
    }

    @Test
    void addExistingMemberRejectsNonLearnerRole() {
        UUID groupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(LearnerGroup.builder().id(groupId).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).role(Role.FORMATEUR).build()));

        assertThrows(ApiException.class, () -> groupService.addExistingMember(groupId, userId, UUID.randomUUID()));
    }

    @Test
    void addExistingMemberThrowsWhenGroupMissing() {
        UUID groupId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> groupService.addExistingMember(groupId, UUID.randomUUID(), UUID.randomUUID()));
    }

    @Test
    void removeMemberRejectsUserFromDifferentGroup() {
        UUID groupId = UUID.randomUUID();
        UUID otherGroupId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(LearnerGroup.builder().id(groupId).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).group(LearnerGroup.builder().id(otherGroupId).build()).build()));

        assertThrows(ApiException.class, () -> groupService.removeMember(groupId, userId, UUID.randomUUID()));
    }

    @Test
    void leaderboardRejectsNonMemberNonStaff() {
        UUID groupId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(LearnerGroup.builder().id(groupId).build()));
        when(userRepository.findById(viewerId)).thenReturn(Optional.of(
                User.builder().id(viewerId).role(Role.ETUDIANT).build()));
        User principalUser = User.builder().id(viewerId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(principalUser);

        assertThrows(ForbiddenException.class, () -> groupService.leaderboard(groupId, principal));
    }

    @Test
    void leaderboardAllowsStaffEvenWithoutMembership() {
        UUID groupId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        when(groupRepository.findById(groupId)).thenReturn(Optional.of(LearnerGroup.builder().id(groupId).build()));
        when(userRepository.findById(viewerId)).thenReturn(Optional.of(
                User.builder().id(viewerId).role(Role.ADMIN).build()));
        when(quizAttemptRepository.averageScoreByGroupGroupedByUser(any(), any())).thenReturn(List.of());
        when(userRepository.findByGroupIdOrderByFullNameAsc(groupId)).thenReturn(List.of());
        User principalUser = User.builder().id(viewerId).role(Role.ADMIN).build();
        UserPrincipal principal = new UserPrincipal(principalUser);

        assertEquals(0, groupService.leaderboard(groupId, principal).size());
    }
}
