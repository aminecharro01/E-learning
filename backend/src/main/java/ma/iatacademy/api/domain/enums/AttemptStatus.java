package ma.iatacademy.api.domain.enums;

public enum AttemptStatus {
    IN_PROGRESS,
    SUBMITTED,
    EXPIRED,
    PASSED,
    FAILED,
    /** Contient au moins une question ESSAY non encore corrigée manuellement. */
    PENDING_REVIEW
}
