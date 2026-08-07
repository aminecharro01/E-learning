package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.EnrollmentMode;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.group.CreateGroupRequest;
import ma.iatacademy.api.dto.group.GroupMemberResponse;
import ma.iatacademy.api.dto.group.GroupResponse;
import ma.iatacademy.api.dto.group.LeaderboardEntryResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LearnerGroupRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final LearnerGroupRepository groupRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final QuizAttemptRepository quizAttemptRepository;
    private final MessagingService messagingService;

    @Transactional
    public GroupResponse create(CreateGroupRequest request, UUID actorId) {
        String name = request.name().trim();
        if (groupRepository.existsByNameIgnoreCase(name)) {
            throw new ApiException("Un groupe porte déjà ce nom.");
        }
        if (request.code() != null && !request.code().isBlank()
                && groupRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ApiException("Ce code de promo est déjà utilisé.");
        }
        LearnerGroup group = LearnerGroup.builder()
                .name(name)
                .code(request.code() != null && !request.code().isBlank() ? request.code().trim() : null)
                .startDate(request.startDate())
                .endDate(request.endDate())
                .enrollmentMode(request.enrollmentMode() != null ? request.enrollmentMode() : EnrollmentMode.HYBRIDE)
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        groupRepository.save(group);
        messagingService.createCohortRoom(group);
        auditLogService.record(actorId, "GROUP_CREATED", "LearnerGroup", group.getId(), name);
        return toResponse(group);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> list() {
        return groupRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> listMembers(UUID groupId) {
        requireGroup(groupId);
        return userRepository.findByGroupIdOrderByFullNameAsc(groupId).stream()
                .map(u -> new GroupMemberResponse(
                        u.getId(),
                        u.getFullName(),
                        // Un compte importé non finalisé porte encore un email placeholder :
                        // ne pas l'afficher, il n'a aucun sens pour le directeur.
                        u.isProfileCompleted() ? u.getEmail() : null,
                        u.getMatricule(),
                        u.isEnabled(),
                        u.isProfileCompleted()))
                .toList();
    }

    /** Réaffectation implicite : un apprenant n'appartient qu'à un seul groupe à la fois. */
    @Transactional
    public void addExistingMember(UUID groupId, UUID userId, UUID actorId) {
        LearnerGroup group = requireGroup(groupId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole() != Role.ETUDIANT) {
            throw new ApiException("Seuls les apprenants peuvent rejoindre un groupe.");
        }
        user.setGroup(group);
        userRepository.save(user);
        auditLogService.record(actorId, "GROUP_MEMBER_ADDED", "User", userId, "group=" + group.getName());
    }

    @Transactional
    public void removeMember(UUID groupId, UUID userId, UUID actorId) {
        requireGroup(groupId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getGroup() == null || !user.getGroup().getId().equals(groupId)) {
            throw new ApiException("Cet apprenant n'appartient pas à ce groupe.");
        }
        user.setGroup(null);
        userRepository.save(user);
        auditLogService.record(actorId, "GROUP_MEMBER_REMOVED", "User", userId, "group=" + groupId);
    }

    @Transactional
    public void delete(UUID groupId, UUID actorId) {
        LearnerGroup group = requireGroup(groupId);
        // Les membres sont détachés (FK ON DELETE SET NULL) : ils redeviennent des
        // apprenants en ligne classiques plutôt que d'être supprimés.
        userRepository.findByGroupIdOrderByFullNameAsc(groupId).forEach(u -> {
            u.setGroup(null);
            userRepository.save(u);
        });
        groupRepository.delete(group);
        auditLogService.record(actorId, "GROUP_DELETED", "LearnerGroup", groupId, group.getName());
    }

    /** Classement optionnel — visible par les membres de la cohorte concernée et le staff. */
    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> leaderboard(UUID groupId, UserPrincipal principal) {
        requireGroup(groupId);
        boolean isMember = userRepository.findById(principal.getId())
                .map(u -> u.getGroup() != null && u.getGroup().getId().equals(groupId))
                .orElse(false);
        if (!isMember && !principal.getRole().isStaff()) {
            throw new ForbiddenException("Classement réservé aux membres de cette cohorte.");
        }
        List<Object[]> rows = quizAttemptRepository.averageScoreByGroupGroupedByUser(
                groupId, List.of(AttemptStatus.PASSED, AttemptStatus.FAILED));
        List<User> users = userRepository.findByGroupIdOrderByFullNameAsc(groupId);
        java.util.Map<UUID, String> namesById = new java.util.HashMap<>();
        users.forEach(u -> namesById.put(u.getId(), u.getFullName() != null ? u.getFullName() : u.getEmail()));

        record Scored(UUID userId, BigDecimal avg) {}
        List<Scored> scored = rows.stream()
                .map(r -> new Scored((UUID) r[0], BigDecimal.valueOf(((Number) r[1]).doubleValue())
                        .setScale(1, RoundingMode.HALF_UP)))
                .sorted(Comparator.comparing(Scored::avg).reversed())
                .toList();

        List<LeaderboardEntryResponse> result = new java.util.ArrayList<>();
        int rank = 1;
        for (Scored s : scored) {
            result.add(new LeaderboardEntryResponse(rank++, s.userId(), namesById.getOrDefault(s.userId(), "—"), s.avg()));
        }
        return result;
    }

    LearnerGroup requireGroup(UUID groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Groupe introuvable."));
    }

    private GroupResponse toResponse(LearnerGroup group) {
        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getCode(),
                group.getStartDate(),
                group.getEndDate(),
                group.getEnrollmentMode(),
                userRepository.countByGroupId(group.getId()),
                group.getCreatedAt());
    }
}
