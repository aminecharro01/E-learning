package ma.iatacademy.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Mot de passe valide, mais le compte a la 2FA activée — un code TOTP est encore requis. */
@Getter
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class TotpRequiredException extends RuntimeException {

    private final String pendingToken;

    public TotpRequiredException(String pendingToken) {
        super("Code de vérification requis.");
        this.pendingToken = pendingToken;
    }
}
