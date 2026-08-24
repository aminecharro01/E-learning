package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.search.SearchResponse;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonBlockRepository lessonBlockRepository;
    @Mock
    private QuestionRepository questionRepository;

    private SearchService searchService;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(moduleRepository, lessonRepository, lessonBlockRepository, questionRepository);
        when(moduleRepository.searchPublishedByTitle(anyString(), any())).thenReturn(List.of());
        when(lessonRepository.searchPublishedByTitle(anyString(), any())).thenReturn(List.of());
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of());
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
    }

    @Test
    void learnerQueryNeverTouchesQuestionRepository() {
        SearchResponse response = searchService.search("aviation", 8, false);

        assertTrue(response.items().isEmpty());
        verifyNoInteractions(questionRepository);
    }

    @Test
    void staffQueryIncludesQuestionResults() {
        Question question = Question.builder()
                .id(UUID.randomUUID())
                .prompt("Quelle est la portance ?")
                .questionType(QuestionType.SINGLE_CHOICE)
                .orderIndex(0)
                .build();
        when(questionRepository.searchByPromptContainingIgnoreCase(anyString(), any())).thenReturn(List.of(question));

        SearchResponse response = searchService.search("portance", 8, true);

        assertEquals(1, response.items().size());
        assertEquals("QUESTION", response.items().get(0).type());
    }

    @Test
    void resultsAreCappedAtRequestedLimit() {
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).title("Module A").build();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).module(module).title("Leçon A").build();
        LessonBlock textBlock = LessonBlock.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .blockType(BlockType.TEXT)
                .content(Map.of("body", "<p>La portance est une force aérodynamique.</p>"))
                .orderIndex(0)
                .build();
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(textBlock, textBlock, textBlock));

        SearchResponse response = searchService.search("portance", 2, false);

        assertEquals(2, response.items().size());
    }
}
