package ma.iatacademy.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Le champ reste nommé "email" pour ne pas casser le contrat côté client, mais il
 * accepte aussi un matricule/CIN : les comptes importés en masse s'authentifient
 * ainsi tant qu'ils n'ont pas complété leur profil. Pas de @Email ici, sinon un
 * matricule serait rejeté par la validation avant même d'atteindre le service.
 */
public record LoginRequest(
        @NotBlank String email,
        @NotBlank String password
) {
}
