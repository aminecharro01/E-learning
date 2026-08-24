package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.QuestionBank;
import ma.iatacademy.api.dto.quiz.AiGenerationRequest;
import ma.iatacademy.api.dto.quiz.AiGenerationResponse;
import ma.iatacademy.api.dto.quiz.CreateQuestionBankRequest;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.dto.quiz.CreateOptionRequest;
import ma.iatacademy.api.dto.quiz.QuestionAdminResponse;
import ma.iatacademy.api.dto.quiz.QuestionBankResponse;
import ma.iatacademy.api.dto.quiz.QuestionImportResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.QuestionBankRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Banque de questions réutilisable pour générer des examens (tirage aléatoire,
 * voir QuizService#generateFromBank). Réutilise l'entité Question existante
 * (question_bank_id nullable, quiz_id nullable) plutôt que de dupliquer le modèle.
 */
@Service
@RequiredArgsConstructor
public class QuestionBankService {

    private final QuestionBankRepository bankRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;
    private final QuizService quizService;
    private final QuestionGenerationService questionGenerationService;

    @Transactional
    public QuestionBankResponse create(CreateQuestionBankRequest request, UUID actorId) {
        QuestionBank bank = QuestionBank.builder()
                .name(request.name().trim())
                .description(request.description())
                .createdBy(userRepository.getReferenceById(actorId))
                .build();
        bankRepository.save(bank);
        return toResponse(bank, 0);
    }

    @Transactional(readOnly = true)
    public List<QuestionBankResponse> list() {
        return bankRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(b -> toResponse(b, questionRepository.countByQuestionBankId(b.getId())))
                .toList();
    }

    @Transactional
    public void delete(UUID bankId) {
        bankRepository.delete(requireBank(bankId));
    }

    @Transactional
    public QuestionAdminResponse addQuestion(UUID bankId, CreateQuestionRequest request) {
        QuestionBank bank = requireBank(bankId);
        quizService.validateQuestionOptions(request);

        int nextOrder = questionRepository.findByQuestionBankIdOrderByOrderIndexAsc(bankId).size();
        Question question = Question.builder()
                .questionBank(bank)
                .prompt(request.prompt().trim())
                .questionType(request.questionType())
                .orderIndex(nextOrder)
                .explanation(request.explanation())
                .imageAssetId(request.imageAssetId())
                .metadata(request.metadata())
                .build();
        for (CreateOptionRequest opt : quizService.optionsOrEmpty(request)) {
            question.getOptions().add(AnswerOption.builder()
                    .question(question)
                    .label(opt.label().trim())
                    .correct(Boolean.TRUE.equals(opt.correct()))
                    .orderIndex(opt.orderIndex())
                    .build());
        }
        questionRepository.save(question);
        return quizService.toQuestionAdmin(question);
    }

    /** Same AI-generation path as QuizService#generateQuestionsAi, targeting a bank instead. */
    @Transactional
    public AiGenerationResponse generateQuestionsAi(UUID bankId, AiGenerationRequest request) {
        requireBank(bankId);
        String sourceText = questionGenerationService.resolveSourceText(request.lessonId(), request.rawText());
        List<CreateQuestionRequest> generated =
                questionGenerationService.generate(sourceText, request.questionType(), request.count());

        int success = 0;
        List<QuestionImportResponse.RowError> errors = new ArrayList<>();
        for (int i = 0; i < generated.size(); i++) {
            try {
                addQuestion(bankId, generated.get(i));
                success++;
            } catch (Exception e) {
                errors.add(new QuestionImportResponse.RowError(i + 1, e.getMessage()));
            }
        }
        return new AiGenerationResponse(success, errors);
    }

    @Transactional
    public void deleteQuestion(UUID bankId, UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new NotFoundException("Question introuvable."));
        if (question.getQuestionBank() == null || !question.getQuestionBank().getId().equals(bankId)) {
            throw new ApiException("La question n'appartient pas à cette banque.");
        }
        questionRepository.delete(question);
    }

    @Transactional(readOnly = true)
    public List<QuestionAdminResponse> listQuestions(UUID bankId) {
        requireBank(bankId);
        return questionRepository.findByQuestionBankIdOrderByOrderIndexAsc(bankId).stream()
                .map(quizService::toQuestionAdmin)
                .toList();
    }

    private QuestionBank requireBank(UUID id) {
        return bankRepository.findById(id).orElseThrow(() -> new NotFoundException("Banque introuvable."));
    }

    private QuestionBankResponse toResponse(QuestionBank b, long count) {
        return new QuestionBankResponse(b.getId(), b.getName(), b.getDescription(), count);
    }
}
