package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.GroupContentAssignment;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.dto.group.AssignContentRequest;
import ma.iatacademy.api.dto.group.AssignmentResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.GroupContentAssignmentRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupContentService {

    private final GroupContentAssignmentRepository assignmentRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional
    public List<AssignmentResponse> assign(UUID groupId, AssignContentRequest request, UUID actorId) {
        LearnerGroup group = groupService.requireGroup(groupId);

        List<ModuleEntity> targets;
        String ufCode = null;
        if (request.targetType() == AssignContentRequest.TargetType.MODULE) {
            if (request.moduleId() == null) {
                throw new ApiException("moduleId requis pour une affectation de module.");
            }
            targets = List.of(moduleRepository.findById(request.moduleId())
                    .orElseThrow(() -> new NotFoundException("Module introuvable.")));
        } else {
            if (request.ufCode() == null || request.ufCode().isBlank()) {
                throw new ApiException("ufCode requis pour une affectation d'unité de formation.");
            }
            ufCode = request.ufCode().trim();
            // Une UF n'est pas une entité : c'est un code porté par les modules.
            final String code = ufCode;
            targets = moduleRepository.findAll().stream()
                    .filter(m -> code.equalsIgnoreCase(m.getUfCode()))
                    .toList();
            if (targets.isEmpty()) {
                throw new NotFoundException("Aucun module pour l'unité " + ufCode + ".");
            }
        }

        for (ModuleEntity module : targets) {
            // Réaffecter un même module met à jour sa date d'ouverture plutôt que
            // de violer la contrainte d'unicité (group_id, module_id).
            GroupContentAssignment assignment = assignmentRepository
                    .findByGroupIdAndModuleId(groupId, module.getId())
                    .orElseGet(() -> GroupContentAssignment.builder()
                            .group(group)
                            .module(module)
                            .createdBy(userRepository.getReferenceById(actorId))
                            .build());
            assignment.setUfCode(ufCode);
            assignment.setUnlockAt(request.unlockAt());
            assignmentRepository.save(assignment);
        }

        auditLogService.record(actorId, "GROUP_CONTENT_ASSIGNED", "LearnerGroup", groupId,
                targets.size() + " module(s)" + (request.unlockAt() == null ? " (immédiat)" : " au " + request.unlockAt()));

        // Prévenir les apprenants seulement si le contenu est déjà ouvert — une
        // ouverture programmée ne doit pas notifier avant l'heure.
        if (request.unlockAt() == null || !request.unlockAt().isAfter(Instant.now())) {
            String title = targets.size() == 1
                    ? "Nouveau module disponible"
                    : targets.size() + " nouveaux modules disponibles";
            String message = targets.size() == 1
                    ? "Le module \"" + targets.get(0).getTitle() + "\" vient d'être ouvert par l'académie."
                    : "L'unité \"" + ufCode + "\" vient d'être ouverte par l'académie.";
            userRepository.findByGroupIdOrderByFullNameAsc(groupId).forEach(member ->
                    notificationService.notify(member, NotificationType.MODULE_ASSIGNED, title, message, "/app"));
        }

        return list(groupId);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> list(UUID groupId) {
        groupService.requireGroup(groupId);
        Instant now = Instant.now();
        return assignmentRepository.findByGroupIdOrderByCreatedAtDesc(groupId).stream()
                .map(a -> new AssignmentResponse(
                        a.getId(),
                        a.getModule().getId(),
                        a.getModule().getTitle(),
                        a.getUfCode(),
                        a.getUnlockAt(),
                        a.getUnlockAt() == null || !a.getUnlockAt().isAfter(now)))
                .toList();
    }

    @Transactional
    public void revoke(UUID groupId, UUID assignmentId, UUID actorId) {
        GroupContentAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new NotFoundException("Affectation introuvable."));
        if (!assignment.getGroup().getId().equals(groupId)) {
            throw new ApiException("Cette affectation n'appartient pas à ce groupe.");
        }
        assignmentRepository.delete(assignment);
        auditLogService.record(actorId, "GROUP_CONTENT_REVOKED", "LearnerGroup", groupId,
                "module=" + assignment.getModule().getTitle());
    }
}
