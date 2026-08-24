package ma.iatacademy.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.config.AiProviderProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.dto.assistant.AssistantAskResponse;
import ma.iatacademy.api.dto.assistant.AssistantSource;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Assistant IA basé sur le contenu des cours — RAG "pauvre" : recherche par mots-clés sur
 * le même contenu déjà indexé pour la recherche globale (blocs TEXT + texte extrait des
 * PDF), pas d'embeddings ni de dépendance payante supplémentaire. Réutilise
 * LessonBlockRepository#searchPublishedTextBlocks/searchPublishedPdfBlocks tel quel.
 * Volontairement absent des pages de quiz (voir ChatbotWidget côté frontend) — interdit
 * pendant une évaluation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CourseAssistantService {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern WORD = Pattern.compile("[\\p{L}]{4,}");
    private static final Set<String> STOPWORDS = Set.of(
            "dans", "avec", "pour", "cette", "quel", "quelle", "quels", "quelles",
            "comment", "pourquoi", "peut", "peux", "pouvez", "sont", "être", "avoir",
            "fait", "faire", "quoi", "vous", "nous", "leur", "leurs", "elle", "elles",
            "ils", "quand", "donc", "alors", "aussi", "plus", "moins", "sujet",
            "expliquer", "expliquez", "parle", "parler", "propos", "sur"
    );
    private static final int MAX_KEYWORDS = 6;
    private static final int MAX_SOURCES = 5;
    private static final int MAX_CHARS_PER_SOURCE = 800;
    private static final int MAX_QUESTION_LENGTH = 500;

    private final LessonBlockRepository lessonBlockRepository;
    private final AssetRepository assetRepository;
    private final AiProviderProperties properties;
    private final RateLimitService rateLimitService;
    private final RestClient restClient = RestClient.create();

    @Transactional(readOnly = true)
    public AssistantAskResponse ask(String question, UUID userId) {
        String q = question == null ? "" : question.trim();
        if (q.isBlank()) {
            throw new ApiException("Posez une question.");
        }
        if (q.length() > MAX_QUESTION_LENGTH) {
            throw new ApiException("Question trop longue (500 caractères maximum).");
        }
        rateLimitService.checkAssistantAllowed(userId.toString());

        List<String> keywords = extractKeywords(q);
        if (keywords.isEmpty()) {
            return new AssistantAskResponse(
                    "Je n'ai pas trouvé de mot-clé exploitable dans votre question — pouvez-vous la reformuler ?",
                    List.of());
        }

        List<ScoredBlock> matches = retrieve(keywords);
        if (matches.isEmpty()) {
            return new AssistantAskResponse(
                    "Je n'ai trouvé aucun contenu de cours en rapport avec votre question. "
                            + "Essayez de reformuler, ou consultez directement le module concerné.",
                    List.of());
        }

        boolean geminiConfigured = properties.getGemini().isConfigured();
        boolean grokConfigured = properties.getGrok().isConfigured();
        if (!geminiConfigured && !grokConfigured) {
            throw new ApiException("Assistant indisponible : aucune clé API Gemini ou Grok configurée.");
        }

        String prompt = buildPrompt(q, matches);
        String answer = null;
        if (geminiConfigured) {
            try {
                answer = callGemini(prompt);
            } catch (Exception e) {
                log.warn("Assistant Gemini échoué, repli sur Grok si configuré : {}", e.getMessage());
            }
        }
        if (answer == null && grokConfigured) {
            try {
                answer = callGrok(prompt);
            } catch (Exception e) {
                log.warn("Assistant Grok échoué : {}", e.getMessage());
            }
        }
        if (answer == null) {
            throw new ApiException("Assistant indisponible pour le moment.");
        }

        List<AssistantSource> sources = matches.stream()
                .map(m -> new AssistantSource(
                        m.block().getLesson().getId(),
                        m.block().getLesson().getTitle(),
                        m.block().getLesson().getModule().getTitle(),
                        "/app/learn/" + m.block().getLesson().getModule().getId()
                                + "/s/" + m.block().getLesson().getId()))
                .distinct()
                .toList();

        return new AssistantAskResponse(answer.trim(), sources);
    }

    private List<String> extractKeywords(String question) {
        var matcher = WORD.matcher(question.toLowerCase());
        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        while (matcher.find() && keywords.size() < MAX_KEYWORDS) {
            String w = matcher.group();
            if (!STOPWORDS.contains(w)) {
                keywords.add(w);
            }
        }
        return new ArrayList<>(keywords);
    }

    private record ScoredBlock(LessonBlock block, int score) {
    }

    /** Une requête ILIKE par mot-clé (réutilise le repository existant) ; les blocs qui
     * ressortent pour plusieurs mots-clés remontent en tête. */
    private List<ScoredBlock> retrieve(List<String> keywords) {
        Pageable top = PageRequest.of(0, 5);
        Map<UUID, ScoredBlock> byId = new LinkedHashMap<>();
        for (String keyword : keywords) {
            for (LessonBlock block : lessonBlockRepository.searchPublishedTextBlocks(keyword, top)) {
                byId.merge(block.getId(), new ScoredBlock(block, 1),
                        (a, b) -> new ScoredBlock(a.block(), a.score() + 1));
            }
            for (LessonBlock block : lessonBlockRepository.searchPublishedPdfBlocks(keyword, top)) {
                byId.merge(block.getId(), new ScoredBlock(block, 1),
                        (a, b) -> new ScoredBlock(a.block(), a.score() + 1));
            }
        }
        return byId.values().stream()
                .sorted(Comparator.comparingInt(ScoredBlock::score).reversed())
                .limit(MAX_SOURCES)
                .toList();
    }

    private String buildPrompt(String question, List<ScoredBlock> matches) {
        StringBuilder context = new StringBuilder();
        int i = 1;
        for (ScoredBlock m : matches) {
            String text = extractText(m.block());
            if (text.isBlank()) {
                continue;
            }
            if (text.length() > MAX_CHARS_PER_SOURCE) {
                text = text.substring(0, MAX_CHARS_PER_SOURCE) + "…";
            }
            context.append("[").append(i++).append("] (").append(m.block().getLesson().getTitle()).append(")\n")
                    .append(text).append("\n\n");
        }
        return """
                Tu es l'assistant pédagogique d'IAT Academy. Réponds à la question de l'apprenant
                UNIQUEMENT à partir des extraits de cours ci-dessous. Si la réponse ne s'y trouve
                pas, dis clairement que tu ne trouves pas l'information dans le cours plutôt que
                d'inventer une réponse. Réponds en français, de façon concise et pédagogique.

                Extraits de cours :
                ---
                %s
                ---

                Question : %s
                """.formatted(context, question);
    }

    private String extractText(LessonBlock block) {
        if (block.getBlockType() == BlockType.PDF) {
            Object assetId = block.getContent().get("assetId");
            if (assetId == null) {
                return "";
            }
            return assetRepository.findById(UUID.fromString(String.valueOf(assetId)))
                    .map(Asset::getExtractedText)
                    .filter(Objects::nonNull)
                    .orElse("");
        }
        Object body = block.getContent().getOrDefault("body", "");
        return HTML_TAG.matcher(String.valueOf(body)).replaceAll(" ").trim();
    }

    // Package-private (not private) so tests can Mockito.spy() and stub the network call.
    String callGemini(String prompt) {
        AiProviderProperties.Gemini gemini = properties.getGemini();
        try {
            Map<String, Object> body = Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
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
                    "messages", List.of(Map.of("role", "user", "content", prompt))
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
}
