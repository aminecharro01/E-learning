package ma.iatacademy.api.service;

import ma.iatacademy.api.config.AiProviderProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.assistant.AssistantAskResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CourseAssistantServiceTest {

    @Mock
    private LessonBlockRepository lessonBlockRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private RateLimitService rateLimitService;
    @Mock
    private ProgressionService progressionService;

    private AiProviderProperties propertiesWith(boolean geminiConfigured, boolean grokConfigured) {
        AiProviderProperties properties = new AiProviderProperties();
        properties.getGemini().setApiKey(geminiConfigured ? "gemini-key" : "");
        properties.getGrok().setApiKey(grokConfigured ? "grok-key" : "");
        return properties;
    }

    private CourseAssistantService newSpy(AiProviderProperties properties) {
        return spy(new CourseAssistantService(
                lessonBlockRepository, assetRepository, properties, rateLimitService, progressionService));
    }

    private UserPrincipal learnerPrincipal() {
        return new UserPrincipal(User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build());
    }

    private UserPrincipal staffPrincipal() {
        return new UserPrincipal(User.builder().id(UUID.randomUUID()).role(Role.FORMATEUR).build());
    }

    private LessonBlock textBlock(String lessonTitle, String moduleTitle, String body) {
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).title(moduleTitle).build();
        Lesson lesson = Lesson.builder().id(UUID.randomUUID()).title(lessonTitle).module(module).build();
        return LessonBlock.builder()
                .id(UUID.randomUUID())
                .lesson(lesson)
                .blockType(BlockType.TEXT)
                .content(Map.of("body", body))
                .build();
    }

    @Test
    void returnsCannedMessageWithoutCallingAiWhenQuestionHasNoUsableKeyword() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));

        AssistantAskResponse response = service.ask("et pour ça ?", learnerPrincipal());

        assertTrue(response.answer().contains("reformuler") || response.answer().contains("mot-clé"));
        assertTrue(response.sources().isEmpty());
    }

    @Test
    void returnsCannedMessageWithoutCallingAiWhenNothingMatches() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of());
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());

        AssistantAskResponse response = service.ask("portance aérodynamique avion", learnerPrincipal());

        assertTrue(response.answer().toLowerCase().contains("aucun contenu"));
        assertTrue(response.sources().isEmpty());
    }

    @Test
    void geminiAnswersFromRetrievedContextAndCitesTheSourceLesson() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));
        LessonBlock block = textBlock("Aérodynamique", "UF 1", "La portance est une force qui s'oppose au poids.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(block));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        when(progressionService.isModuleAccessible(any(), any())).thenReturn(true);
        doReturn("La portance est la force aérodynamique qui s'oppose au poids.").when(service).callGemini(anyString());

        AssistantAskResponse response = service.ask("qu'est-ce que la portance ?", learnerPrincipal());

        assertEquals("La portance est la force aérodynamique qui s'oppose au poids.", response.answer());
        assertEquals(1, response.sources().size());
        assertEquals("Aérodynamique", response.sources().get(0).lessonTitle());
    }

    @Test
    void excludesContentFromModulesNotYetUnlockedForThisLearner() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));
        LessonBlock locked = textBlock("UF avancée", "UF 3", "Contenu d'un module pas encore débloqué.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(locked));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        when(progressionService.isModuleAccessible(any(), any())).thenReturn(false);

        AssistantAskResponse response = service.ask("question sur un sujet avancé", learnerPrincipal());

        assertTrue(response.answer().toLowerCase().contains("aucun contenu"));
        assertTrue(response.sources().isEmpty());
        verify(service, never()).callGemini(anyString());
    }

    @Test
    void mixesAccessibleAndLockedContentKeepingOnlyTheAccessibleOne() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));
        LessonBlock unlocked = textBlock("Module débloqué", "UF 1", "Contenu accessible.");
        LessonBlock locked = textBlock("Module verrouillé", "UF 3", "Contenu pas encore débloqué.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(unlocked, locked));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        when(progressionService.isModuleAccessible(any(), org.mockito.ArgumentMatchers.eq(unlocked.getLesson().getModule())))
                .thenReturn(true);
        when(progressionService.isModuleAccessible(any(), org.mockito.ArgumentMatchers.eq(locked.getLesson().getModule())))
                .thenReturn(false);
        doReturn("Réponse basée uniquement sur le contenu accessible.").when(service).callGemini(anyString());

        AssistantAskResponse response = service.ask("question", learnerPrincipal());

        assertEquals(1, response.sources().size());
        assertEquals("Module débloqué", response.sources().get(0).lessonTitle());
    }

    @Test
    void staffIsNeverFilteredByProgression() {
        CourseAssistantService service = newSpy(propertiesWith(true, false));
        LessonBlock block = textBlock("N'importe quel module", "UF 5", "Contenu.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(block));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        doReturn("Réponse.").when(service).callGemini(anyString());

        AssistantAskResponse response = service.ask("question", staffPrincipal());

        assertEquals(1, response.sources().size());
        verify(progressionService, never()).isModuleAccessible(any(), any());
    }

    @Test
    void fallsBackToGrokWhenGeminiFails() {
        CourseAssistantService service = newSpy(propertiesWith(true, true));
        LessonBlock block = textBlock("Aérodynamique", "UF 1", "La portance est une force qui s'oppose au poids.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(block));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        lenient().when(progressionService.isModuleAccessible(any(), any())).thenReturn(true);
        doThrow(new RuntimeException("Gemini indisponible")).when(service).callGemini(anyString());
        doReturn("Réponse de secours via Grok.").when(service).callGrok(anyString());

        AssistantAskResponse response = service.ask("qu'est-ce que la portance ?", learnerPrincipal());

        assertEquals("Réponse de secours via Grok.", response.answer());
    }

    @Test
    void throwsWhenBothProvidersFail() {
        CourseAssistantService service = newSpy(propertiesWith(true, true));
        LessonBlock block = textBlock("Aérodynamique", "UF 1", "La portance est une force qui s'oppose au poids.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(block));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        lenient().when(progressionService.isModuleAccessible(any(), any())).thenReturn(true);
        doThrow(new RuntimeException("Gemini indisponible")).when(service).callGemini(anyString());
        doThrow(new RuntimeException("Grok indisponible")).when(service).callGrok(anyString());

        assertThrows(ApiException.class, () -> service.ask("qu'est-ce que la portance ?", learnerPrincipal()));
    }

    @Test
    void throwsWhenNoProviderConfiguredButContentMatches() {
        CourseAssistantService service = newSpy(propertiesWith(false, false));
        LessonBlock block = textBlock("Aérodynamique", "UF 1", "La portance est une force qui s'oppose au poids.");
        when(lessonBlockRepository.searchPublishedTextBlocks(anyString(), any())).thenReturn(List.of(block));
        when(lessonBlockRepository.searchPublishedPdfBlocks(anyString(), any())).thenReturn(List.of());
        when(progressionService.isModuleAccessible(any(), any())).thenReturn(true);

        assertThrows(ApiException.class, () -> service.ask("qu'est-ce que la portance ?", learnerPrincipal()));
    }
}
