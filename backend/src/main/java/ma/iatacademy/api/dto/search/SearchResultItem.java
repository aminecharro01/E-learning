package ma.iatacademy.api.dto.search;

import java.util.UUID;

public record SearchResultItem(
        UUID id,
        String type,
        String title,
        String link,
        String snippet
) {
    public SearchResultItem(UUID id, String type, String title, String link) {
        this(id, type, title, link, null);
    }
}
