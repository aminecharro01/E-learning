package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Assignment;
import ma.iatacademy.api.domain.entity.GradeAdjustment;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.Submission;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.gradebook.GradebookResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssignmentRepository;
import ma.iatacademy.api.repository.GradeAdjustmentRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.repository.SubmissionRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GradebookServiceTest {

    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuizAttemptRepository quizAttemptRepository;
    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private SubmissionRepository submissionRepository;
    @Mock
    private GradeAdjustmentRepository gradeAdjustmentRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private GradebookService gradebookService;

    @Test
    void buildThrowsNotFoundWhenModuleMissing() {
        UUID moduleId = UUID.randomUUID();
        when(moduleRepository.existsById(moduleId)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> gradebookService.build(moduleId));
    }

    @Test
    void buildSkipsStudentsWithNoScoresAndNoBonus() {
        UUID moduleId = UUID.randomUUID();
        when(moduleRepository.existsById(moduleId)).thenReturn(true);
        when(quizRepository.findByModuleIdOrderByCreatedAtDesc(moduleId)).thenReturn(List.of());
        when(assignmentRepository.findByModuleIdOrderByDueAtAsc(moduleId)).thenReturn(List.of());
        User student = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).fullName("No Score").build();
        when(userRepository.findByRole(Role.ETUDIANT)).thenReturn(List.of(student));
        lenient().when(gradeAdjustmentRepository.findByUserIdAndModuleId(any(), any())).thenReturn(List.of());

        GradebookResponse response = gradebookService.build(moduleId);

        assertTrue(response.rows().isEmpty());
    }

    @Test
    void buildComputesBestQuizScoreAssignmentGradeAndBonus() {
        UUID moduleId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).title("Quiz 1").build();
        Assignment assignment = Assignment.builder().id(UUID.randomUUID()).title("Devoir 1").build();
        User student = User.builder().id(studentId).role(Role.ETUDIANT).fullName("Alice").build();

        when(moduleRepository.existsById(moduleId)).thenReturn(true);
        when(quizRepository.findByModuleIdOrderByCreatedAtDesc(moduleId)).thenReturn(List.of(quiz));
        when(assignmentRepository.findByModuleIdOrderByDueAtAsc(moduleId)).thenReturn(List.of(assignment));
        when(userRepository.findByRole(Role.ETUDIANT)).thenReturn(List.of(student));

        QuizAttempt lowAttempt = QuizAttempt.builder().status(AttemptStatus.FAILED).score(BigDecimal.valueOf(40)).build();
        QuizAttempt highAttempt = QuizAttempt.builder().status(AttemptStatus.PASSED).score(BigDecimal.valueOf(90)).build();
        when(quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(studentId, quiz.getId()))
                .thenReturn(List.of(lowAttempt, highAttempt));

        Submission submission = Submission.builder().grade(BigDecimal.valueOf(70)).build();
        when(submissionRepository.findByAssignmentIdAndUserId(assignment.getId(), studentId))
                .thenReturn(Optional.of(submission));

        GradeAdjustment adjustment = GradeAdjustment.builder().points(BigDecimal.valueOf(5)).build();
        when(gradeAdjustmentRepository.findByUserIdAndModuleId(studentId, moduleId)).thenReturn(List.of(adjustment));

        GradebookResponse response = gradebookService.build(moduleId);

        assertEquals(1, response.rows().size());
        GradebookResponse.StudentRow row = response.rows().get(0);
        assertEquals("Alice", row.fullName());
        assertEquals(0, BigDecimal.valueOf(5).compareTo(row.bonus()));
        // average of best quiz score (90) and assignment grade (70) = 80, plus bonus 5 = 85
        assertEquals(0, BigDecimal.valueOf(85).compareTo(row.average()));
    }

    @Test
    void addAdjustmentSavesAndAudits() {
        var request = new ma.iatacademy.api.dto.assignment.CreateGradeAdjustmentRequest(
                UUID.randomUUID(), UUID.randomUUID(), BigDecimal.TEN, "Bonus participation");
        when(userRepository.getReferenceById(any())).thenReturn(User.builder().id(UUID.randomUUID()).build());
        when(moduleRepository.getReferenceById(any())).thenReturn(ModuleEntity.builder().id(UUID.randomUUID()).build());

        gradebookService.addAdjustment(request, UUID.randomUUID());

        org.mockito.Mockito.verify(gradeAdjustmentRepository).save(any(GradeAdjustment.class));
        org.mockito.Mockito.verify(auditLogService).record(any(), org.mockito.ArgumentMatchers.eq("GRADE_ADJUSTMENT_ADDED"),
                any(), any(), any());
    }
}
