package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.quiz.*;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

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
}
