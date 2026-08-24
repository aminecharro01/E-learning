package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.quiz.AiGenerationRequest;
import ma.iatacademy.api.dto.quiz.AiGenerationResponse;
import ma.iatacademy.api.dto.quiz.CreateQuestionBankRequest;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.dto.quiz.QuestionAdminResponse;
import ma.iatacademy.api.dto.quiz.QuestionBankResponse;
import ma.iatacademy.api.dto.quiz.QuestionImportResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.QuestionBankService;
import ma.iatacademy.api.service.QuestionImportService;
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
@RequestMapping("/api/question-banks")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
public class QuestionBankController {

    private final QuestionBankService questionBankService;
    private final QuestionImportService questionImportService;

    @GetMapping
    public ResponseEntity<List<QuestionBankResponse>> list() {
        return ResponseEntity.ok(questionBankService.list());
    }

    @PostMapping
    public ResponseEntity<QuestionBankResponse> create(
            @Valid @RequestBody CreateQuestionBankRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionBankService.create(request, principal.getId()));
    }

    @DeleteMapping("/{bankId}")
    public ResponseEntity<MessageResponse> delete(@PathVariable UUID bankId) {
        questionBankService.delete(bankId);
        return ResponseEntity.ok(new MessageResponse("Banque supprimée."));
    }

    @GetMapping("/{bankId}/questions")
    public ResponseEntity<List<QuestionAdminResponse>> listQuestions(@PathVariable UUID bankId) {
        return ResponseEntity.ok(questionBankService.listQuestions(bankId));
    }

    @PostMapping("/{bankId}/questions")
    public ResponseEntity<QuestionAdminResponse> addQuestion(
            @PathVariable UUID bankId,
            @Valid @RequestBody CreateQuestionRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionBankService.addQuestion(bankId, request));
    }

    @PostMapping(value = "/{bankId}/questions/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuestionImportResponse> importQuestions(
            @PathVariable UUID bankId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionImportService.importIntoBank(bankId, file));
    }

    @PostMapping("/{bankId}/questions/generate-ai")
    public ResponseEntity<AiGenerationResponse> generateQuestionsAi(
            @PathVariable UUID bankId,
            @Valid @RequestBody AiGenerationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionBankService.generateQuestionsAi(bankId, request));
    }

    @DeleteMapping("/{bankId}/questions/{questionId}")
    public ResponseEntity<MessageResponse> deleteQuestion(
            @PathVariable UUID bankId,
            @PathVariable UUID questionId
    ) {
        questionBankService.deleteQuestion(bankId, questionId);
        return ResponseEntity.ok(new MessageResponse("Question supprimée."));
    }
}
