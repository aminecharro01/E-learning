package ma.iatacademy.api.domain.enums;

public enum Role {
    SUPER_ADMIN,
    ADMIN,
    FORMATEUR,
    ETUDIANT,
    SUPPORT;

    /** ADMIN (Directeur), FORMATEUR and SUPER_ADMIN are all "staff" for access-control purposes. */
    public boolean isStaff() {
        return this == SUPER_ADMIN || this == ADMIN || this == FORMATEUR;
    }
}
