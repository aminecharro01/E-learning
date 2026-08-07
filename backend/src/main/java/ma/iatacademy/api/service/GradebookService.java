package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Assignment;
import ma.iatacademy.api.domain.entity.GradeAdjustment;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.Submission;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.assignment.CreateGradeAdjustmentRequest;
import ma.iatacademy.api.dto.gradebook.GradebookResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssignmentRepository;
import ma.iatacademy.api.repository.GradeAdjustmentRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.repository.SubmissionRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Vue agrégée en lecture (aucune table de faits dédiée) : Étudiants × Évaluations,
 * assemblée à la volée à partir de QuizAttempt (meilleur score), Submission (devoirs)
 * et GradeAdjustment (bonus manuel).
 */
@Service
@RequiredArgsConstructor
public class GradebookService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final GradeAdjustmentRepository gradeAdjustmentRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public GradebookResponse build(UUID moduleId) {
        if (!moduleRepository.existsById(moduleId)) {
            throw new NotFoundException("Module introuvable.");
        }
        List<Quiz> quizzes = quizRepository.findByModuleIdOrderByCreatedAtDesc(moduleId);
        List<Assignment> assignments = assignmentRepository.findByModuleIdOrderByDueAtAsc(moduleId);

        List<GradebookResponse.EvaluationColumn> evaluations = new ArrayList<>();
        quizzes.forEach(q -> evaluations.add(new GradebookResponse.EvaluationColumn(q.getId(), q.getTitle(), "QUIZ")));
        assignments.forEach(a -> evaluations.add(new GradebookResponse.EvaluationColumn(a.getId(), a.getTitle(), "ASSIGNMENT")));

        List<User> students = userRepository.findByRole(Role.ETUDIANT);
        List<GradebookResponse.StudentRow> rows = new ArrayList<>();
        for (User student : students) {
            Map<String, BigDecimal> scores = new LinkedHashMap<>();
            List<BigDecimal> gradable = new ArrayList<>();
            for (Quiz q : quizzes) {
                BigDecimal best = bestQuizScore(student.getId(), q.getId());
                if (best != null) {
                    scores.put(q.getId().toString(), best);
                    gradable.add(best);
                }
            }
            for (Assignment a : assignments) {
                submissionRepository.findByAssignmentIdAndUserId(a.getId(), student.getId())
                        .map(Submission::getGrade)
                        .filter(g -> g != null)
                        .ifPresent(g -> {
                            scores.put(a.getId().toString(), g);
                            gradable.add(g);
                        });
            }
            BigDecimal bonus = gradeAdjustmentRepository.findByUserIdAndModuleId(student.getId(), moduleId).stream()
                    .map(GradeAdjustment::getPoints)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal average = gradable.isEmpty()
                    ? null
                    : gradable.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(gradable.size()), 2, RoundingMode.HALF_UP)
                            .add(bonus);
            if (!scores.isEmpty() || bonus.compareTo(BigDecimal.ZERO) != 0) {
                rows.add(new GradebookResponse.StudentRow(
                        student.getId(),
                        student.getFullName() != null ? student.getFullName() : student.getEmail(),
                        scores, bonus, average));
            }
        }
        rows.sort(Comparator.comparing(GradebookResponse.StudentRow::fullName));
        return new GradebookResponse(evaluations, rows);
    }

    @Transactional
    public void addAdjustment(CreateGradeAdjustmentRequest request, UUID actorId) {
        GradeAdjustment adjustment = GradeAdjustment.builder()
                .user(userRepository.getReferenceById(request.userId()))
                .module(moduleRepository.getReferenceById(request.moduleId()))
                .points(request.points())
                .reason(request.reason())
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        gradeAdjustmentRepository.save(adjustment);
        auditLogService.record(actorId, "GRADE_ADJUSTMENT_ADDED", "User", request.userId(),
                request.points() + " pts — " + (request.reason() != null ? request.reason() : ""));
    }

    private BigDecimal bestQuizScore(UUID userId, UUID quizId) {
        return quizAttemptRepository.findByUserIdAndQuizIdOrderByStartedAtDesc(userId, quizId).stream()
                .filter(a -> a.getStatus() == AttemptStatus.PASSED || a.getStatus() == AttemptStatus.FAILED)
                .map(QuizAttempt::getScore)
                .filter(s -> s != null)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
