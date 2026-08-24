package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.entity.Question;
import ma.iatacademy.api.dto.search.SearchResponse;
import ma.iatacademy.api.dto.search.SearchResultItem;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.QuestionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final QuestionRepository questionRepository;

    /** @param includeQuestions staff-only — a learner query must never surface quiz question
     *  prompts, or search becomes a way to look up answers. See SearchController. */
    @Transactional(readOnly = true)
    public SearchResponse search(String query, int limit, boolean includeQuestions) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            return new SearchResponse(List.of());
        }
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 25));

        List<SearchResultItem> results = new ArrayList<>();
        moduleRepository.searchPublishedByTitle(q, pageable).forEach(m ->
                results.add(new SearchResultItem(m.getId(), "MODULE", m.getTitle(), "/app/learn/" + m.getId())));
        lessonRepository.searchPublishedByTitle(q, pageable).forEach(l ->
                results.add(new SearchResultItem(
                        l.getId(), "LESSON", l.getTitle(),
                        "/app/learn/" + l.getModule().getId() + "/s/" + l.getId())));

        for (LessonBlock block : lessonBlockRepository.searchPublishedTextBlocks(q, pageable)) {
            String body = String.valueOf(block.getContent().getOrDefault("body", ""));
            results.add(new SearchResultItem(
                    block.getLesson().getId(), "LESSON_CONTENT", block.getLesson().getTitle(),
                    "/app/learn/" + block.getLesson().getModule().getId() + "/s/" + block.getLesson().getId(),
                    snippet(stripHtml(body), q)));
        }
        for (LessonBlock block : lessonBlockRepository.searchPublishedPdfBlocks(q, pageable)) {
            results.add(new SearchResultItem(
                    block.getLesson().getId(), "LESSON_PDF", block.getLesson().getTitle(),
                    "/app/learn/" + block.getLesson().getModule().getId() + "/s/" + block.getLesson().getId(),
                    null));
        }

        if (includeQuestions) {
            for (Question question : questionRepository.searchByPromptContainingIgnoreCase(q, pageable)) {
                String link = question.getQuiz() != null ? "/admin/quiz-bank" : "/admin/question-banks";
                results.add(new SearchResultItem(question.getId(), "QUESTION", question.getPrompt(), link));
            }
        }

        if (results.size() > pageable.getPageSize()) {
            results.subList(pageable.getPageSize(), results.size()).clear();
        }
        return new SearchResponse(results);
    }

    private String stripHtml(String html) {
        return HTML_TAG.matcher(html).replaceAll(" ").trim();
    }

    /** Short excerpt centered on the first match — nothing fancier is needed for a search dropdown. */
    private String snippet(String text, String query) {
        if (text.isBlank()) {
            return null;
        }
        int idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx < 0) {
            return text.length() <= 120 ? text : text.substring(0, 120) + "…";
        }
        int radius = 60;
        int start = Math.max(0, idx - radius);
        int end = Math.min(text.length(), idx + query.length() + radius);
        String excerpt = text.substring(start, end).trim();
        return (start > 0 ? "…" : "") + excerpt + (end < text.length() ? "…" : "");
    }
}
