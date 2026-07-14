package ma.iatacademy.api.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.Instant;
import java.util.UUID;

@Getter
@ResponseStatus(HttpStatus.CONFLICT)
public class LessonLockedException extends RuntimeException {

    private final UUID lockedBy;
    private final String lockedByName;
    private final Instant lockedAt;
    private final Instant expiresAt;

    public LessonLockedException(UUID lockedBy, String lockedByName, Instant lockedAt, Instant expiresAt) {
        super("Cette leçon est en cours d'édition par " + lockedByName + ".");
        this.lockedBy = lockedBy;
        this.lockedByName = lockedByName;
        this.lockedAt = lockedAt;
        this.expiresAt = expiresAt;
    }
}
