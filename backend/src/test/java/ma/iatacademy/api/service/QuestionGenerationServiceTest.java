package ma.iatacademy.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.iatacademy.api.config.AiProviderProperties;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.spy;

@ExtendWith(MockitoExtension.class)
class QuestionGenerationServiceTest {

    @Mock
    private LessonRepository lessonRepository;
    @Mock
    private LessonBlockRepository lessonBlockRepository;

    private static final String VALID_JSON = """
            {"questions": [
              {"prompt": "Quelle est la portance ?", "options": [
                {"label": "Une force aérodynamique", "correct": true},
                {"label": "Un carburant", "correct": false}
              ], "explanation": "La portance s'oppose au poids."}
            ]}
            """;

    private AiProviderProperties propertiesWith(boolean geminiConfigured, boolean grokConfigured) {
        AiProviderProperties properties = new AiProviderProperties();
        properties.getGemini().setApiKey(geminiConfigured ? "gemini-key" : "");
        properties.getGrok().setApiKey(grokConfigured ? "grok-key" : "");
        return properties;
    }

    private QuestionGenerationService newSpy(AiProviderProperties properties) {
        return spy(new QuestionGenerationService(
                properties, lessonRepository, lessonBlockRepository, new ObjectMapper()));
    }

    @Test
    void geminiResponseIsParsedIntoQuestionRequests() {
        QuestionGenerationService service = newSpy(propertiesWith(true, false));
        doReturn(VALID_JSON).when(service).callGemini(anyString());

        List<CreateQuestionRequest> results = service.generate("cours d'aérodynamique", QuestionType.SINGLE_CHOICE, 1);

        assertEquals(1, results.size());
        assertEquals("Quelle est la portance ?", results.get(0).prompt());
        assertEquals(2, results.get(0).options().size());
    }

    @Test
    void fallsBackToGrokWhenGeminiFails() {
        QuestionGenerationService service = newSpy(propertiesWith(true, true));
        doThrow(new RuntimeException("Gemini indisponible")).when(service).callGemini(anyString());
        doReturn(VALID_JSON).when(service).callGrok(anyString());

        List<CreateQuestionRequest> results = service.generate("cours d'aérodynamique", QuestionType.SINGLE_CHOICE, 1);

        assertEquals(1, results.size());
    }

    @Test
    void throwsWhenBothProvidersFail() {
        QuestionGenerationService service = newSpy(propertiesWith(true, true));
        doThrow(new RuntimeException("Gemini indisponible")).when(service).callGemini(anyString());
        doThrow(new RuntimeException("Grok indisponible")).when(service).callGrok(anyString());

        assertThrows(ApiException.class,
                () -> service.generate("cours d'aérodynamique", QuestionType.SINGLE_CHOICE, 1));
    }

    @Test
    void throwsWhenNoProviderConfigured() {
        QuestionGenerationService service = newSpy(propertiesWith(false, false));

        assertThrows(ApiException.class,
                () -> service.generate("cours d'aérodynamique", QuestionType.SINGLE_CHOICE, 1));
    }
}
