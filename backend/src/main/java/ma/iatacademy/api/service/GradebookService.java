package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Assignment;
import ma.iatacademy.api.domain.entity.GradeAdjustment;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.Submission;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.assignment.CreateGradeAdjustmentRequest;
import ma.iatacademy.api.dto.gradebook.GradebookResponse;
import ma.iatacademy.api.dto.gradebook.LearnerBulletinResponse;
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

import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;

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

    /**
     * The learner's own report card across every module - self-scoped by studentId,
     * never a client-supplied one (see GradebookController). Skips modules with no
     * gradable content yet, same as build() does per-student, so an early learner
     * doesn't see 35 empty rows.
     */
    @Transactional(readOnly = true)
    public LearnerBulletinResponse buildForStudent(UUID studentId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        List<ModuleEntity> allModules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(DEFAULT_FORMATION_ID);

        List<LearnerBulletinResponse.ModuleBulletin> moduleBulletins = new ArrayList<>();
        List<BigDecimal> moduleAverages = new ArrayList<>();

        for (ModuleEntity module : allModules) {
            List<Quiz> quizzes = quizRepository.findByModuleIdOrderByCreatedAtDesc(module.getId());
            List<Assignment> assignments = assignmentRepository.findByModuleIdOrderByDueAtAsc(module.getId());

            List<LearnerBulletinResponse.EvaluationScore> evaluations = new ArrayList<>();
            List<BigDecimal> gradable = new ArrayList<>();

            for (Quiz q : quizzes) {
                BigDecimal best = bestQuizScore(studentId, q.getId());
                if (best != null) {
                    gradable.add(best);
                    evaluations.add(new LearnerBulletinResponse.EvaluationScore(
                            q.getId(), q.getTitle(), "QUIZ", best, BigDecimal.valueOf(100),
                            q.getPassingScore(), best.compareTo(BigDecimal.valueOf(q.getPassingScore())) >= 0));
                }
            }
            for (Assignment a : assignments) {
                submissionRepository.findByAssignmentIdAndUserId(a.getId(), studentId)
                        .map(Submission::getGrade)
                        .filter(g -> g != null)
                        .ifPresent(g -> {
                            gradable.add(g);
                            evaluations.add(new LearnerBulletinResponse.EvaluationScore(
                                    a.getId(), a.getTitle(), "ASSIGNMENT", g, a.getMaxScore(), null, null));
                        });
            }

            BigDecimal bonus = gradeAdjustmentRepository.findByUserIdAndModuleId(studentId, module.getId()).stream()
                    .map(GradeAdjustment::getPoints)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (evaluations.isEmpty() && bonus.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            BigDecimal average = gradable.isEmpty()
                    ? null
                    : gradable.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(gradable.size()), 2, RoundingMode.HALF_UP)
                            .add(bonus);
            if (average != null) {
                moduleAverages.add(average);
            }
            moduleBulletins.add(new LearnerBulletinResponse.ModuleBulletin(
                    module.getId(), module.getTitle(), evaluations, bonus, average));
        }

        BigDecimal overallAverage = moduleAverages.isEmpty()
                ? null
                : moduleAverages.stream().reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(moduleAverages.size()), 2, RoundingMode.HALF_UP);

        return new LearnerBulletinResponse(
                student.getFullName() != null ? student.getFullName() : student.getEmail(),
                overallAverage,
                moduleBulletins);
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
