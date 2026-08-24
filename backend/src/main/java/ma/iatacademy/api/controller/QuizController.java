package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.proctoring.ProctoringEventRequest;
import ma.iatacademy.api.dto.proctoring.ProctoringEventResponse;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.quiz.*;
import ma.iatacademy.api.service.QuestionImportService;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;
    private final QuestionImportService questionImportService;

    @PostMapping("/{id}/start")
    public ResponseEntity<QuizStartResponse> start(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(quizService.start(id, principal));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<QuizSubmitResponse> submit(
            @PathVariable UUID id,
            @Valid @RequestBody QuizSubmitRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(quizService.submit(id, request, principal));
    }

    @GetMapping("/{id}/attempts/all")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<QuizAttemptAdminResponse>> attemptsForStaff(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.listAttemptsForStaff(id));
    }

    @GetMapping("/uf-quiz")
    public ResponseEntity<?> ufQuiz(@RequestParam String ufCode) {
        var quiz = quizService.getUfQuiz(ufCode);
        return quiz != null ? ResponseEntity.ok(quiz) : ResponseEntity.noContent().build();
    }

    @GetMapping("/year-exam")
    public ResponseEntity<?> yearExam(
            @RequestParam int year,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        var exam = quizService.getYearExam(year, principal);
        return exam != null ? ResponseEntity.ok(exam) : ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/attempts")
    public ResponseEntity<List<QuizAttemptResponse>> attempts(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(quizService.listAttempts(id, principal));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuizAdminResponse> create(@Valid @RequestBody CreateQuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.createQuiz(request));
    }

    @PostMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuizAdminResponse> addQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.addQuestion(id, request));
    }

    @PutMapping("/{id}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuestionAdminResponse> updateQuestion(
            @PathVariable UUID id,
            @PathVariable UUID questionId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        return ResponseEntity.ok(quizService.updateQuestion(id, questionId, request));
    }

    @DeleteMapping("/{id}/questions/{questionId}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable UUID id,
            @PathVariable UUID questionId
    ) {
        quizService.deleteQuestion(id, questionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/questions/{questionId}/duplicate")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuestionAdminResponse> duplicateQuestion(
            @PathVariable UUID id,
            @PathVariable UUID questionId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.duplicateQuestion(id, questionId));
    }

    @PutMapping("/{id}/questions/reorder")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> reorderQuestions(
            @PathVariable UUID id,
            @Valid @RequestBody ReorderQuestionsRequest request
    ) {
        quizService.reorderQuestions(id, request.questionIds());
        return ResponseEntity.ok(new MessageResponse("Ordre mis à jour."));
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuizAdminResponse> duplicateQuiz(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.duplicateQuiz(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<Void> deleteQuiz(@PathVariable UUID id) {
        quizService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/questions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<QuestionImportResponse> importQuestions(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionImportService.importIntoQuiz(id, file));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<?> list(
            @RequestParam(required = false) UUID moduleId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        if (page != null) {
            return ResponseEntity.ok(quizService.listQuizzesPaged(moduleId, page, size != null ? size : 10));
        }
        return ResponseEntity.ok(quizService.listQuizzes(moduleId));
    }

    @GetMapping("/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<QuestionAdminResponse>> listQuestions(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.listQuestions(id));
    }

    @PostMapping("/attempts/{attemptId}/proctoring-events")
    public ResponseEntity<MessageResponse> recordProctoringEvent(
            @PathVariable UUID attemptId,
            @Valid @RequestBody ProctoringEventRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        quizService.recordProctoringEvent(attemptId, request, principal);
        return ResponseEntity.ok(new MessageResponse("Évènement enregistré."));
    }

    @GetMapping("/attempts/{attemptId}/proctoring-events")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<ProctoringEventResponse>> listProctoringEvents(@PathVariable UUID attemptId) {
        return ResponseEntity.ok(quizService.listProctoringEvents(attemptId));
    }

    @GetMapping("/attempts/pending-review")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<PendingReviewAttemptResponse>> listPendingReview(
            @RequestParam(required = false) UUID quizId
    ) {
        return ResponseEntity.ok(quizService.listPendingReview(quizId));
    }

    @PatchMapping("/attempts/{attemptId}/questions/{questionId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<MessageResponse> gradeEssay(
            @PathVariable UUID attemptId,
            @PathVariable UUID questionId,
            @Valid @RequestBody GradeEssayRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        quizService.gradeEssay(attemptId, questionId, request, principal.getId());
        return ResponseEntity.ok(new MessageResponse("Question corrigée."));
    }
}
