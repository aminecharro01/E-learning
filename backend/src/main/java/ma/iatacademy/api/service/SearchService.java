package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.search.SearchResponse;
import ma.iatacademy.api.dto.search.SearchResultItem;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;

    @Transactional(readOnly = true)
    public SearchResponse search(String query, int limit) {
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

        return new SearchResponse(results);
    }
}
