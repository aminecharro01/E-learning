package ma.iatacademy.api.domain.enums;

import lombok.Getter;

@Getter
public enum BadgeCode {
    FIRST_MODULE("Premier module", "Premier module terminé.", "🎓"),
    PERFECT_QUIZ("Sans faute", "100% obtenu à un quiz.", "🏆"),
    STAGE_VALIDATED("Stage validé", "Unité de stage validée par l'académie.", "🧳"),
    PROFILE_COMPLETE("Profil complété", "Profil personnalisé avec succès.", "📇"),
    FORUM_CONTRIBUTOR("Premier message", "Première participation à un forum de discussion.", "💬");

    private final String label;
    private final String description;
    private final String icon;

    BadgeCode(String label, String description, String icon) {
        this.label = label;
        this.description = description;
        this.icon = icon;
    }
}
