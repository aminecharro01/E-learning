package ma.iatacademy.api.domain.enums;

public enum QuizType {
    APPLICATIF,
    FIN_MODULE,
    /** Fin d'Unité de Formation — l'UF n'est pas une entité propre, juste un ufCode partagé
     *  par plusieurs modules ; voir Quiz#ufCode et ProgressionService#isUfFullyDone. */
    FIN_UF,
    /** Fin d'année (1 ou 2) — voir Quiz#yearNumber et ProgressionService#isYear1FullyDone. */
    FIN_ANNEE
}
