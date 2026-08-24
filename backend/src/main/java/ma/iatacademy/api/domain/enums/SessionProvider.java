package ma.iatacademy.api.domain.enums;

public enum SessionProvider {
    ZOOM,
    GOOGLE_MEET,
    TEAMS,
    /** Conservées pour compatibilité avec d'anciennes sessions déjà enregistrées — non proposées à la création. */
    JITSI,
    OTHER
}
