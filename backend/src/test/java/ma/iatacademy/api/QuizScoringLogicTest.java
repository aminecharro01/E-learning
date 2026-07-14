package ma.iatacademy.api;

import org.junit.jupiter.api.Test;
import ma.iatacademy.api.domain.entity.AnswerOption;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.enums.QuestionType;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class QuizScoringLogicTest {

    @Test
    void singleChoiceRequiresExactCorrectOption() {
        UUID correctId = UUID.randomUUID();
        UUID wrongId = UUID.randomUUID();
        Question question = Question.builder()
                .prompt("Q1")
                .questionType(QuestionType.SINGLE_CHOICE)
                .orderIndex(0)
                .build();
        question.getOptions().add(AnswerOption.builder().id(correctId).label("A").correct(true).orderIndex(0).build());
        question.getOptions().add(AnswerOption.builder().id(wrongId).label("B").correct(false).orderIndex(1).build());

        assertTrue(isAnswerCorrect(question, List.of(correctId.toString())));
        assertFalse(isAnswerCorrect(question, List.of(wrongId.toString())));
        assertFalse(isAnswerCorrect(question, List.of(correctId.toString(), wrongId.toString())));
    }

    private boolean isAnswerCorrect(Question question, List<String> selectedRaw) {
        Set<UUID> selected = selectedRaw.stream().map(UUID::fromString).collect(Collectors.toSet());
        Set<UUID> correct = question.getOptions().stream()
                .filter(AnswerOption::isCorrect)
                .map(AnswerOption::getId)
                .collect(Collectors.toSet());
        return selected.equals(correct);
    }
}
