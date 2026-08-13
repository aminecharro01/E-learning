package ma.iatacademy.api.domain.enums;

public enum QuestionType {
    SINGLE_CHOICE,
    MULTI_CHOICE,
    TRUE_FALSE,
    /** Corrigée manuellement — jamais notée automatiquement, voir EssayGrade. */
    ESSAY
}
