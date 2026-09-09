package ma.iatacademy.api.service;

import ma.iatacademy.api.config.QuizProperties;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.enums.QuizQuestionMode;
import ma.iatacademy.api.domain.enums.QuizType;
import ma.iatacademy.api.dto.quiz.CreateQuizRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

/** Le mode d'un quiz (AUTO_GRADED vs OPEN_ENDED, voir QuizQuestionMode) est fixé à sa
 * création et ne peut plus changer une fois qu'il contient des questions. */
@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuestionRepository questionRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private FormationRepository formationRepository;
    @Mock
    private QuizProperties quizProperties;
    @Mock
    private ProgressionService progressionService;
    @Mock
    private QuestionService questionService;
    @Mock
    private QuizAttemptService quizAttemptService;
    @Mock
    private QuizGradingService quizGradingService;

    @InjectMocks
    private QuizService quizService;

    private CreateQuizRequest request(UUID moduleId, QuizQuestionMode mode) {
        return new CreateQuizRequest("Titre", QuizType.FIN_MODULE, mode, null, moduleId, null, null,
                50, 5, 0, true, true, 1440, false, false, false, false, false, false);
    }

    @Test
    void updateQuizRejectsQuestionModeChangeWhenQuestionsExist() {
        UUID quizId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.AUTO_GRADED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(moduleRepository.findById(moduleId)).thenReturn(Optional.of(ModuleEntity.builder().id(moduleId).build()));
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId))
                .thenReturn(List.of(Question.builder().id(UUID.randomUUID()).build()));

        assertThrows(ApiException.class,
                () -> quizService.updateQuiz(quizId, request(moduleId, QuizQuestionMode.OPEN_ENDED)));
    }

    @Test
    void updateQuizAllowsQuestionModeChangeWhenNoQuestionsExist() {
        UUID quizId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(quizId).questionMode(QuizQuestionMode.AUTO_GRADED).build();
        when(quizRepository.findById(quizId)).thenReturn(Optional.of(quiz));
        when(moduleRepository.findById(moduleId)).thenReturn(Optional.of(ModuleEntity.builder().id(moduleId).build()));
        when(questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)).thenReturn(List.of());

        var result = assertDoesNotThrow(
                () -> quizService.updateQuiz(quizId, request(moduleId, QuizQuestionMode.OPEN_ENDED)));

        assertEquals(QuizQuestionMode.OPEN_ENDED, result.questionMode());
    }
}
