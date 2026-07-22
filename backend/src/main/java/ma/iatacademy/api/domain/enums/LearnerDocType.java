package ma.iatacademy.api.domain.enums;

/**
 * Types de pièces du dossier Stage (année 1) et Soutenance (année 2).
 */
public enum LearnerDocType {
    /** Directeur — convention école (signée électroniquement). */
    CONVENTION_ECOLE,
    /** Directeur — attestation d'assurance. */
    ASSURANCE,
    /** Apprenant — convention après signature entreprise. */
    CONVENTION_ENTREPRISE,
    /** Apprenant — rapport de stage. */
    RAPPORT_STAGE,
    /** Apprenant — présentation soutenance (digitale). */
    PRESENTATION_SOUTENANCE
}
