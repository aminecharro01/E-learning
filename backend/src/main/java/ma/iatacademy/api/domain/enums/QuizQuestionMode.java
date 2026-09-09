package ma.iatacademy.api.domain.enums;

/**
 * Fixé à la création du quiz — verrouille le type de question acceptable pour
 * tout le quiz, afin de ne jamais mélanger une correction automatique (score
 * immédiat) avec une correction manuelle (score affiché après correction).
 */
public enum QuizQuestionMode {
    /** SINGLE_CHOICE / MULTI_CHOICE / TRUE_FALSE uniquement — score calculé immédiatement. */
    AUTO_GRADED,
    /** ESSAY uniquement — score affiché seulement après correction manuelle (PENDING_REVIEW). */
    OPEN_ENDED
}
