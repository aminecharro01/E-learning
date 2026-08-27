package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Assignment;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Submission;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.SubmissionStatus;
import ma.iatacademy.api.dto.assignment.CreateAssignmentRequest;
import ma.iatacademy.api.dto.assignment.GradeSubmissionRequest;
import ma.iatacademy.api.dto.assignment.SubmissionResponse;
import ma.iatacademy.api.dto.media.AssetResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.AssignmentRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.SubmissionRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MediaService mediaService;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AssignmentService assignmentService;

    @Test
    void createThrowsWhenModuleMissing() {
        UUID moduleId = UUID.randomUUID();
        CreateAssignmentRequest request = new CreateAssignmentRequest(moduleId, "Devoir 1", null, null, null);
        when(moduleRepository.findById(moduleId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> assignmentService.create(request, UUID.randomUUID()));
    }

    @Test
    void createDefaultsMaxScoreTo100WhenNotProvided() {
        UUID moduleId = UUID.randomUUID();
        CreateAssignmentRequest request = new CreateAssignmentRequest(moduleId, "Devoir 1", null, null, null);
        when(moduleRepository.findById(moduleId)).thenReturn(Optional.of(ModuleEntity.builder().id(moduleId).build()));
        when(userRepository.getReferenceById(any())).thenReturn(User.builder().id(UUID.randomUUID()).build());
        when(submissionRepository.findByAssignmentId(any())).thenReturn(java.util.List.of());

        var response = assignmentService.create(request, UUID.randomUUID());

        assertEquals(0, BigDecimal.valueOf(100).compareTo(response.maxScore()));
    }

    @Test
    void submitMarksLateWhenPastDueDate() {
        UUID assignmentId = UUID.randomUUID();
        Assignment assignment = Assignment.builder().id(assignmentId)
                .dueAt(Instant.now().minus(1, ChronoUnit.DAYS)).build();
        when(assignmentRepository.findById(assignmentId)).thenReturn(Optional.of(assignment));
        when(mediaService.upload(any(), eq("DOCUMENT"), any()))
                .thenReturn(new AssetResponse(UUID.randomUUID(), "file.pdf", "application/pdf", 100L, "DOCUMENT", null, null, null, null));
        UUID userId = UUID.randomUUID();
        when(submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(assetRepository.getReferenceById(any())).thenReturn(new ma.iatacademy.api.domain.entity.Asset());

        User user = User.builder().id(userId).build();
        UserPrincipal principal = new UserPrincipal(user);
        MockMultipartFile file = new MockMultipartFile("file", "devoir.pdf", "application/pdf", new byte[]{1, 2, 3});

        SubmissionResponse response = assignmentService.submit(assignmentId, file, principal);

        assertEquals(SubmissionStatus.LATE, response.status());
    }

    @Test
    void gradeSubmissionUpdatesStatusAndNotifies() {
        UUID submissionId = UUID.randomUUID();
        Assignment assignment = Assignment.builder().title("Devoir 1").build();
        User student = User.builder().id(UUID.randomUUID()).fullName("Etudiant").build();
        Submission submission = Submission.builder().id(submissionId).assignment(assignment).user(student).build();
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(userRepository.getReferenceById(any())).thenReturn(User.builder().id(UUID.randomUUID()).build());

        GradeSubmissionRequest request = new GradeSubmissionRequest(BigDecimal.valueOf(85), "Bon travail");
        assignmentService.gradeSubmission(submissionId, request, UUID.randomUUID());

        assertEquals(SubmissionStatus.GRADED, submission.getStatus());
        verify(submissionRepository, times(1)).save(submission);
        verify(notificationService, times(1)).notify(any(), any(), any(), any(), any(), eq(true));
    }

    @Test
    void gradeSubmissionThrowsWhenMissing() {
        UUID submissionId = UUID.randomUUID();
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> assignmentService.gradeSubmission(submissionId, new GradeSubmissionRequest(BigDecimal.TEN, null), UUID.randomUUID()));
    }

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
