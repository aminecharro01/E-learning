package ma.iatacademy.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.config.AiProviderProperties;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.QuestionType;
import ma.iatacademy.api.dto.quiz.CreateOptionRequest;
import ma.iatacademy.api.dto.quiz.CreateQuestionRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonRepository;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Génération de questions par IA — Gemini en priorité, Grok en repli si Gemini n'est pas
 * configuré ou échoue (voir AiProviderProperties). Ne persiste rien elle-même : renvoie
 * des CreateQuestionRequest, que QuizService/QuestionBankService valident et sauvegardent
 * via leur chemin d'ajout de question existant (mêmes invariants qu'une question manuelle).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionGenerationService {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern JSON_FENCE = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```");

    private final AiProviderProperties properties;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    /** Resolves the text fed to the model — either the caller's own text, or every TEXT
     * block of a lesson concatenated (HTML tags stripped). */
    public String resolveSourceText(UUID lessonId, String rawText) {
        if (rawText != null && !rawText.isBlank()) {
            return rawText;
        }
        if (lessonId == null) {
            throw new ApiException("Fournissez un texte source ou une leçon.");
        }
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
        String text = lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId()).stream()
                .filter(b -> b.getBlockType() == BlockType.TEXT)
                .map(b -> String.valueOf(b.getContent().getOrDefault("body", "")))
                .map(html -> HTML_TAG.matcher(html).replaceAll(" "))
                .collect(Collectors.joining("\n\n"))
                .trim();
        if (text.isBlank()) {
            throw new ApiException("Cette leçon ne contient pas de texte exploitable pour la génération IA.");
        }
        return text;
    }

    public List<CreateQuestionRequest> generate(String sourceText, QuestionType type, int count) {
        boolean geminiConfigured = properties.getGemini().isConfigured();
        boolean grokConfigured = properties.getGrok().isConfigured();
        if (!geminiConfigured && !grokConfigured) {
            throw new ApiException("Génération IA indisponible : aucune clé API Gemini ou Grok configurée.");
        }

        String prompt = buildPrompt(sourceText, type, count);

        if (geminiConfigured) {
            try {
                return parseQuestions(callGemini(prompt), type);
            } catch (Exception e) {
                log.warn("Génération Gemini échouée, repli sur Grok si configuré : {}", e.getMessage());
            }
        }
        if (grokConfigured) {
            try {
                return parseQuestions(callGrok(prompt), type);
            } catch (Exception e) {
                log.warn("Génération Grok échouée : {}", e.getMessage());
            }
        }
        throw new ApiException("Génération IA indisponible pour le moment (Gemini et Grok ont échoué).");
    }

    private String buildPrompt(String sourceText, QuestionType type, int count) {
        String typeInstructions = switch (type) {
            case SINGLE_CHOICE -> "chaque question a 4 options, une seule correcte (\"correct\": true sur une seule option).";
            case MULTI_CHOICE -> "chaque question a 4 options, au moins une correcte, plusieurs réponses correctes possibles.";
            case TRUE_FALSE -> "chaque question a exactement 2 options (\"Vrai\" et \"Faux\"), une seule correcte.";
            case ESSAY -> "chaque question est une question ouverte, sans options (tableau \"options\" vide).";
        };
        return """
                Tu es un générateur de questions de quiz pédagogiques en français, à partir du contenu de cours suivant :

                ---
                %s
                ---

                Génère exactement %d question(s) de type %s. %s
                Réponds UNIQUEMENT avec un objet JSON strictement valide, sans texte autour, au format suivant :
                {"questions": [{"prompt": "...", "options": [{"label": "...", "correct": true}], "explanation": "..."}]}
                """.formatted(sourceText, count, type, typeInstructions);
    }

    // Package-private (not private) so tests can Mockito.spy() and stub the network call
    // without exercising real HTTP — see QuestionGenerationServiceTest.
    String callGemini(String prompt) {
        AiProviderProperties.Gemini gemini = properties.getGemini();
        try {
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", Map.of("responseMimeType", "application/json")
            );
            JsonNode response = restClient.post()
                    .uri("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                            gemini.getModel(), gemini.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return response.at("/candidates/0/content/parts/0/text").asText();
        } catch (RestClientException e) {
            throw new ApiException("Échec de l'appel à Gemini : " + e.getMessage());
        }
    }

    String callGrok(String prompt) {
        AiProviderProperties.Grok grok = properties.getGrok();
        try {
            Map<String, Object> body = Map.of(
                    "model", grok.getModel(),
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "response_format", Map.of("type", "json_object")
            );
            JsonNode response = restClient.post()
                    .uri("https://api.x.ai/v1/chat/completions")
                    .header("Authorization", "Bearer " + grok.getApiKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            return response.at("/choices/0/message/content").asText();
        } catch (RestClientException e) {
            throw new ApiException("Échec de l'appel à Grok : " + e.getMessage());
        }
    }

    private List<CreateQuestionRequest> parseQuestions(String rawJson, QuestionType type) throws Exception {
        String json = extractJson(rawJson);
        JsonNode root = objectMapper.readTree(json);
        JsonNode questionsNode = root.has("questions") ? root.get("questions") : root;
        if (!questionsNode.isArray()) {
            throw new ApiException("Réponse IA inattendue (tableau de questions introuvable).");
        }

        List<CreateQuestionRequest> results = new ArrayList<>();
        for (JsonNode qNode : questionsNode) {
            String prompt = qNode.path("prompt").asText("");
            if (prompt.isBlank()) {
                continue;
            }
            List<CreateOptionRequest> options = new ArrayList<>();
            int i = 0;
            for (JsonNode optNode : qNode.path("options")) {
                options.add(new CreateOptionRequest(
                        optNode.path("label").asText(""),
                        optNode.path("correct").asBoolean(false),
                        i++
                ));
            }
            String explanation = qNode.path("explanation").asText(null);
            results.add(new CreateQuestionRequest(prompt.trim(), type, explanation, null, options, null));
        }
        if (results.isEmpty()) {
            throw new ApiException("La réponse IA ne contient aucune question exploitable.");
        }
        return results;
    }

    /** Some models wrap JSON in ```json fences despite instructions — strip them if present. */
    private String extractJson(String raw) {
        var matcher = JSON_FENCE.matcher(raw);
        return matcher.find() ? matcher.group(1).trim() : raw.trim();
    }
}
