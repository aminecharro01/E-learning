package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;
import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.dto.catalog.ModuleQuizItemResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.dto.proctoring.ProctoringEventRequest;
import ma.iatacademy.api.dto.proctoring.ProctoringEventResponse;
import ma.iatacademy.api.dto.quiz.AiGenerationRequest;
import ma.iatacademy.api.dto.quiz.AiGenerationResponse;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.dto.quiz.CreateQuizRequest;
import ma.iatacademy.api.dto.quiz.GradeEssayRequest;
import ma.iatacademy.api.dto.quiz.PendingReviewAttemptResponse;
import ma.iatacademy.api.dto.quiz.QuestionAdminResponse;
import ma.iatacademy.api.dto.quiz.QuizAdminResponse;
import ma.iatacademy.api.dto.quiz.QuizAttemptAdminResponse;
import ma.iatacademy.api.dto.quiz.QuizAttemptResponse;
import ma.iatacademy.api.dto.quiz.QuizStartResponse;
import ma.iatacademy.api.dto.quiz.QuizSubmitRequest;
import ma.iatacademy.api.dto.quiz.QuizSubmitResponse;
import ma.iatacademy.api.dto.quiz.YearExamResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cycle de vie du quiz (création, duplication, suppression, listing) — le reste (tentatives,
 * correction, questions) a été extrait dans QuizAttemptService / QuizGradingService /
 * QuestionService pour que chaque classe reste lisible (cette classe faisait 1009 lignes).
 * QuizService reste le point d'entrée unique pour QuizController — aucun changement de
 * contrat d'API — et délègue chaque appel hors "cycle de vie du quiz" à la classe concernée.
 */
@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final FormationRepository formationRepository;
    private final QuizProperties quizProperties;
    private final ProgressionService progressionService;
    private final QuestionService questionService;
    private final QuizAttemptService quizAttemptService;
    private final QuizGradingService quizGradingService;

    // --- Tentatives, déléguées à QuizAttemptService ---

    public QuizStartResponse start(UUID quizId, UserPrincipal principal) {
        return quizAttemptService.start(quizId, principal);
    }

    public void recordProctoringEvent(UUID attemptId, ProctoringEventRequest request, UserPrincipal principal) {
        quizAttemptService.recordProctoringEvent(attemptId, request, principal);
    }

    public List<QuizAttemptAdminResponse> listAttemptsForStaff(UUID quizId) {
        return quizAttemptService.listAttemptsForStaff(quizId);
    }

    public List<ProctoringEventResponse> listProctoringEvents(UUID attemptId) {
        return quizAttemptService.listProctoringEvents(attemptId);
    }

    public QuizSubmitResponse submit(UUID quizId, QuizSubmitRequest request, UserPrincipal principal) {
        return quizAttemptService.submit(quizId, request, principal);
    }

    public List<QuizAttemptResponse> listAttempts(UUID quizId, UserPrincipal principal) {
        return quizAttemptService.listAttempts(quizId, principal);
    }

    // --- Correction, déléguée à QuizGradingService ---

    public void gradeEssay(UUID attemptId, UUID questionId, GradeEssayRequest request, UUID graderId) {
        quizGradingService.gradeEssay(attemptId, questionId, request, graderId);
    }

    public List<PendingReviewAttemptResponse> listPendingReview(UUID quizId) {
        return quizGradingService.listPendingReview(quizId);
    }

    // --- Questions, déléguées à QuestionService ---

    public QuizAdminResponse addQuestion(UUID quizId, CreateQuestionRequest request) {
        return questionService.addQuestion(quizId, request);
    }

    public AiGenerationResponse generateQuestionsAi(UUID quizId, AiGenerationRequest request, UUID actorId) {
        return questionService.generateQuestionsAi(quizId, request, actorId);
    }

    public QuestionAdminResponse updateQuestion(UUID quizId, UUID questionId, CreateQuestionRequest request) {
        return questionService.updateQuestion(quizId, questionId, request);
    }

    public void deleteQuestion(UUID quizId, UUID questionId) {
        questionService.deleteQuestion(quizId, questionId);
    }

    public QuestionAdminResponse duplicateQuestion(UUID quizId, UUID questionId) {
        return questionService.duplicateQuestion(quizId, questionId);
    }

    public void reorderQuestions(UUID quizId, List<UUID> orderedQuestionIds) {
        questionService.reorderQuestions(quizId, orderedQuestionIds);
    }

    public List<QuestionAdminResponse> listQuestions(UUID quizId) {
        return questionService.listQuestions(quizId);
    }

    // --- Cycle de vie du quiz lui-même ---

    @Transactional
    public QuizAdminResponse createQuiz(CreateQuizRequest request) {
        Lesson lesson = null;
        ModuleEntity module = null;
        Formation formation = null;
        String ufCode = null;
        Integer yearNumber = null;

        switch (request.quizType()) {
            case APPLICATIF -> {
                if (request.lessonId() == null) {
                    throw new ApiException("lessonId requis pour un quiz de section.");
                }
                lesson = lessonRepository.findById(request.lessonId())
                        .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
                module = lesson.getModule();
            }
            case FIN_MODULE -> {
                if (request.moduleId() == null) {
                    throw new ApiException("moduleId requis pour une évaluation de module.");
                }
                module = moduleRepository.findById(request.moduleId())
                        .orElseThrow(() -> new NotFoundException("Module introuvable."));
            }
            case FIN_UF -> {
                if (request.ufCode() == null || request.ufCode().isBlank()) {
                    throw new ApiException("ufCode requis pour un quiz de fin d'UF.");
                }
                ufCode = request.ufCode().trim();
                formation = formationRepository.findById(DEFAULT_FORMATION_ID)
                        .orElseThrow(() -> new NotFoundException("Formation introuvable."));
            }
            case FIN_ANNEE -> {
                if (request.yearNumber() == null || (request.yearNumber() != 1 && request.yearNumber() != 2)) {
                    throw new ApiException("yearNumber (1 ou 2) requis pour un quiz de fin d'année.");
                }
                yearNumber = request.yearNumber();
                formation = formationRepository.findById(DEFAULT_FORMATION_ID)
                        .orElseThrow(() -> new NotFoundException("Formation introuvable."));
            }
        }

        boolean isModuleQuiz = request.quizType() == QuizType.FIN_MODULE;
        Quiz quiz = Quiz.builder()
                .title(request.title().trim())
                .quizType(request.quizType())
                .lesson(lesson)
                .module(module)
                .formation(formation)
                .ufCode(ufCode)
                .yearNumber(yearNumber)
                .passingScore(request.passingScore() != null
                        ? request.passingScore()
                        : (isModuleQuiz
                        ? quizProperties.getDefaultModulePassingScore()
                        : quizProperties.getDefaultSectionPassingScore()))
                .maxAttempts(request.maxAttempts() != null
                        ? request.maxAttempts()
                        : (isModuleQuiz ? quizProperties.getDefaultModuleMaxAttempts() : 5))
                .timeLimitSeconds(request.timeLimitSeconds() != null
                        ? request.timeLimitSeconds()
                        : (isModuleQuiz ? quizProperties.getDefaultModuleTimeLimitSeconds() : 0))
                .randomizeQuestions(request.randomizeQuestions() == null || request.randomizeQuestions())
                .randomizeOptions(request.randomizeOptions() == null || request.randomizeOptions())
                .retryDelayHours(request.retryDelayHours() != null
                        ? request.retryDelayHours()
                        : quizProperties.getDefaultRetryDelayHours())
                .blocking(request.blocking() != null ? request.blocking() : isModuleQuiz)
                .published(Boolean.TRUE.equals(request.published()))
                .proctoringEnabled(Boolean.TRUE.equals(request.proctoringEnabled()))
                .focusLossDetection(Boolean.TRUE.equals(request.focusLossDetection()))
                .copyProtection(Boolean.TRUE.equals(request.copyProtection()))
                .lockdownMode(Boolean.TRUE.equals(request.lockdownMode()))
                .build();
        quizRepository.save(quiz);

        return toAdmin(quiz);
    }

    /** Fin d'UF quiz for the sidebar — null if none is configured for this UF. */
    @Transactional(readOnly = true)
    public ModuleQuizItemResponse getUfQuiz(String ufCode) {
        return quizRepository.findByFormationIdAndUfCodeAndQuizType(DEFAULT_FORMATION_ID, ufCode, QuizType.FIN_UF)
                .map(q -> new ModuleQuizItemResponse(q.getId(), q.getTitle(), q.getQuizType(), null, null, q.isPublished()))
                .orElse(null);
    }

    /** Fin d'année quiz for the learner dashboard CTA — null if none is configured for that year. */
    @Transactional(readOnly = true)
    public YearExamResponse getYearExam(int yearNumber, UserPrincipal principal) {
        Quiz quiz = quizRepository
                .findByFormationIdAndYearNumberAndQuizType(DEFAULT_FORMATION_ID, yearNumber, QuizType.FIN_ANNEE)
                .orElse(null);
        if (quiz == null) {
            return null;
        }
        boolean unlocked = yearNumber == 1
                ? progressionService.isYear1ContentDone(principal.getId(), DEFAULT_FORMATION_ID)
                : false; // only year 1 -> 2 progression is modeled today
        return new YearExamResponse(quiz.getId(), quiz.getTitle(), unlocked);
    }

    /** Duplique le quiz entier (réglages + questions) — la copie est dépubliée, à relire avant activation. */
    @Transactional
    public QuizAdminResponse duplicateQuiz(UUID quizId) {
        Quiz source = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        Quiz copy = Quiz.builder()
                .title(source.getTitle() + " (copie)")
                .quizType(source.getQuizType())
                .lesson(source.getLesson())
                .module(source.getModule())
                .passingScore(source.getPassingScore())
                .maxAttempts(source.getMaxAttempts())
                .timeLimitSeconds(source.getTimeLimitSeconds())
                .randomizeQuestions(source.isRandomizeQuestions())
                .randomizeOptions(source.isRandomizeOptions())
                .retryDelayHours(source.getRetryDelayHours())
                .blocking(source.isBlocking())
                .published(false)
                .proctoringEnabled(source.isProctoringEnabled())
                .focusLossDetection(source.isFocusLossDetection())
                .copyProtection(source.isCopyProtection())
                .lockdownMode(source.isLockdownMode())
                .build();
        quizRepository.save(copy);

        questionService.copyQuestionsToQuiz(quizId, copy);
        return toAdmin(copy);
    }

    /** Supprime le quiz et tout ce qui en dépend (questions, options, tentatives) — cascade DB. */
    @Transactional
    public void deleteQuiz(UUID quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new NotFoundException("Quiz introuvable."));
        quizRepository.delete(quiz);
    }

    @Transactional(readOnly = true)
    public PageResponse<QuizAdminResponse> listQuizzesPaged(UUID moduleId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Quiz> quizzes = moduleId != null
                ? quizRepository.findByModuleId(moduleId, pageable)
                : quizRepository.findAll(pageable);
        return PageResponse.from(quizzes.map(this::toAdmin));
    }

    @Transactional(readOnly = true)
    public List<QuizAdminResponse> listQuizzes(UUID moduleId) {
        List<Quiz> quizzes = moduleId != null
                ? quizRepository.findByModuleIdOrderByCreatedAtDesc(moduleId)
                : quizRepository.findAllByOrderByCreatedAtDesc();
        return quizzes.stream().map(this::toAdmin).toList();
    }

    private QuizAdminResponse toAdmin(Quiz quiz) {
        int count = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId()).size();
        return new QuizAdminResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getQuizType(),
                quiz.getLesson() != null ? quiz.getLesson().getId() : null,
                quiz.getModule() != null ? quiz.getModule().getId() : null,
                quiz.getUfCode(),
                quiz.getYearNumber(),
                quiz.getPassingScore(),
                quiz.getMaxAttempts(),
                quiz.getTimeLimitSeconds(),
                quiz.isRandomizeQuestions(),
                quiz.isRandomizeOptions(),
                quiz.getRetryDelayHours(),
                quiz.isBlocking(),
                quiz.isPublished(),
                quiz.isProctoringEnabled(),
                quiz.isFocusLossDetection(),
                quiz.isCopyProtection(),
                quiz.isLockdownMode(),
                count
        );
    }
}
