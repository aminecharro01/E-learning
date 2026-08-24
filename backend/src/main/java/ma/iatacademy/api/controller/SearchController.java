package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.search.SearchResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.SearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @RequestParam("q") String q,
            @RequestParam(defaultValue = "8") int limit,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        boolean includeQuestions = principal != null && principal.getRole().isStaff();
        return ResponseEntity.ok(searchService.search(q, limit, includeQuestions));
    }
}
