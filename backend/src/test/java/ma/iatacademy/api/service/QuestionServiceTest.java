package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.domain.enums.QuizQuestionMode;
import ma.iatacademy.api.dto.quiz.CreateOptionRequest;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.QuestionRepository;
import ma.iatacademy.api.repository.QuizRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Un quiz est fixé en mode AUTO_GRADED (choix) ou OPEN_ENDED (réponse libre) à sa création
 * et ne doit jamais mélanger les deux — voir QuizQuestionMode.
 */
@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private QuestionGenerationService questionGenerationService;
    @Mock
    private RateLimitService rateLimitService;

    @InjectMocks
    private QuestionService questionService;

    private CreateQuestionRequest choiceRequest(QuestionType type) {
        return new CreateQuestionRequest("Prompt ?", type, null, null,
                List.of(new CreateOptionRequest("A", true, 0), new CreateOptionRequest("B", false, 1)), null);
    }

    private CreateQuestionRequest essayRequest() {
        return new CreateQuestionRequest("Expliquez.", QuestionType.ESSAY, null, null, null, null);
    }

    @Test
    void addQuestionRejectsEssayOnAutoGradedQuiz() {
        UUID quizId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.AUTO_GRADED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));

        ApiException ex = assertThrows(ApiException.class,
                () -> questionService.addQuestion(quizId, essayRequest()));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("questions à choix"));
    }

    @Test
    void addQuestionRejectsChoiceTypeOnOpenEndedQuiz() {
        UUID quizId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.OPEN_ENDED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));

        ApiException ex = assertThrows(ApiException.class,
                () -> questionService.addQuestion(quizId, choiceRequest(QuestionType.SINGLE_CHOICE)));
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("réponse libre"));
    }

    @Test
    void addQuestionAcceptsChoiceTypeOnAutoGradedQuiz() {
        UUID quizId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.AUTO_GRADED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        lenient().when(questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)).thenReturn(List.of());

        assertDoesNotThrow(() -> questionService.addQuestion(quizId, choiceRequest(QuestionType.SINGLE_CHOICE)));
    }

    @Test
    void addQuestionAcceptsEssayOnOpenEndedQuiz() {
        UUID quizId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.OPEN_ENDED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        lenient().when(questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)).thenReturn(List.of());

        assertDoesNotThrow(() -> questionService.addQuestion(quizId, essayRequest()));
    }

    @Test
    void updateQuestionRejectsEssayOnAutoGradedQuiz() {
        UUID quizId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.AUTO_GRADED).build();
        Question question = Question.builder().id(questionId).quiz(quiz).questionType(QuestionType.SINGLE_CHOICE).build();
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));

        assertThrows(ApiException.class,
                () -> questionService.updateQuestion(quizId, questionId, essayRequest()));
    }
}
