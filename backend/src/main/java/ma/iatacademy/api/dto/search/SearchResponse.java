package ma.iatacademy.api.dto.search;

import java.util.List;

public record SearchResponse(List<SearchResultItem> items) {
}
