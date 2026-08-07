package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Assignment;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Submission;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.NotificationType;
import ma.iatacademy.api.domain.enums.SubmissionStatus;
import ma.iatacademy.api.dto.assignment.AssignmentResponse;
import ma.iatacademy.api.dto.assignment.CreateAssignmentRequest;
import ma.iatacademy.api.dto.assignment.GradeSubmissionRequest;
import ma.iatacademy.api.dto.assignment.LearnerAssignmentResponse;
import ma.iatacademy.api.dto.assignment.SubmissionResponse;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.AssignmentRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.SubmissionRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final MediaService mediaService;
    private final AssetRepository assetRepository;
    private final NotificationService notificationService;

    @Transactional
    public AssignmentResponse create(CreateAssignmentRequest request, UUID actorId) {
        ModuleEntity module = moduleRepository.findById(request.moduleId())
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        Assignment assignment = Assignment.builder()
                .module(module)
                .title(request.title().trim())
                .description(request.description())
                .dueAt(request.dueAt())
                .maxScore(request.maxScore() != null ? request.maxScore() : BigDecimal.valueOf(100))
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        assignmentRepository.save(assignment);
        return toResponse(assignment);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> listByModule(UUID moduleId) {
        return assignmentRepository.findByModuleIdOrderByDueAtAsc(moduleId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Vue apprenant : devoirs d'un module + son propre dépôt (statut/note) le cas échéant. */
    @Transactional(readOnly = true)
    public List<LearnerAssignmentResponse> listByModuleForLearner(UUID moduleId, UUID userId) {
        return assignmentRepository.findByModuleIdOrderByDueAtAsc(moduleId).stream()
                .map(a -> new LearnerAssignmentResponse(
                        a.getId(), a.getModule().getId(), a.getModule().getTitle(),
                        a.getTitle(), a.getDescription(), a.getDueAt(), a.getMaxScore(),
                        submissionRepository.findByAssignmentIdAndUserId(a.getId(), userId)
                                .map(this::toResponse).orElse(null)))
                .toList();
    }

    @Transactional
    public void delete(UUID assignmentId) {
        assignmentRepository.delete(requireAssignment(assignmentId));
    }

    @Transactional
    public SubmissionResponse submit(UUID assignmentId, MultipartFile file, UserPrincipal principal) {
        Assignment assignment = requireAssignment(assignmentId);
        AssetResponse asset = mediaService.upload(file, "DOCUMENT", principal.getId());
        boolean late = assignment.getDueAt() != null && Instant.now().isAfter(assignment.getDueAt());

        Submission submission = submissionRepository.findByAssignmentIdAndUserId(assignmentId, principal.getId())
                .orElseGet(() -> Submission.builder()
                        .assignment(assignment)
                        .user(userRepository.getReferenceById(principal.getId()))
                        .build());
        submission.setAsset(assetRepository.getReferenceById(asset.id()));
        submission.setSubmittedAt(Instant.now());
        submission.setStatus(late ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED);
        // Une nouvelle soumission efface une éventuelle note précédente — à re-corriger.
        submission.setGrade(null);
        submission.setFeedback(null);
        submissionRepository.save(submission);
        return toResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> listSubmissions(UUID assignmentId) {
        return submissionRepository.findByAssignmentId(assignmentId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void gradeSubmission(UUID submissionId, GradeSubmissionRequest request, UUID graderId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Dépôt introuvable."));
        submission.setGrade(request.grade());
        submission.setFeedback(request.feedback());
        submission.setStatus(SubmissionStatus.GRADED);
        submission.setGradedBy(userRepository.getReferenceById(graderId));
        submission.setGradedAt(Instant.now());
        submissionRepository.save(submission);

        notificationService.notify(submission.getUser(),
                NotificationType.GRADE_PUBLISHED,
                "Devoir corrigé",
                "\"" + submission.getAssignment().getTitle() + "\" — note : " + request.grade() + ".",
                "/app", true);
    }

    private Assignment requireAssignment(UUID id) {
        return assignmentRepository.findById(id).orElseThrow(() -> new NotFoundException("Devoir introuvable."));
    }

    private AssignmentResponse toResponse(Assignment a) {
        return new AssignmentResponse(
                a.getId(), a.getModule().getId(), a.getTitle(), a.getDescription(),
                a.getDueAt(), a.getMaxScore(), submissionRepository.findByAssignmentId(a.getId()).size());
    }

    private SubmissionResponse toResponse(Submission s) {
        User user = s.getUser();
        return new SubmissionResponse(
                s.getId(), s.getAssignment().getId(), user.getId(),
                user.getFullName() != null ? user.getFullName() : user.getEmail(),
                s.getAsset() != null ? s.getAsset().getId() : null,
                s.getSubmittedAt(), s.getStatus(), s.getGrade(), s.getFeedback());
    }
}
