package ma.iatacademy.api.exception;

import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Thrown by Tomcat when a client disconnects mid-download — routine for large media
     * streams (a browser cancelling a video/PDF/image request when the user navigates away
     * or scrubs playback). Falling through to handleGeneric() below tried to write a JSON
     * error body onto a response whose headers were already committed with the asset's own
     * Content-Type (e.g. video/mp4), which Jackson can't do — logged as a confusing
     * secondary "No converter for HashMap" failure that masked what actually happened.
     * void + no body write here: the client is already gone, there's nothing to send.
     */
    @ExceptionHandler(ClientAbortException.class)
    public void handleClientAbort(ClientAbortException ex) {
        log.debug("Client disconnected mid-response (likely a cancelled media download): {}", ex.getMessage());
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApi(ApiException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(ForbiddenException ex) {
        return build(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    /**
     * Thrown by Spring Security's @PreAuthorize when a role check fails. Without this
     * handler it falls through to handleGeneric() and comes back as 500, which both
     * hides real server errors in logs/monitoring and defeats the frontend's dedicated
     * "Accès refusé." 403 handling in api-client.ts.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "Accès refusé.");
    }

    @ExceptionHandler(LessonLockedException.class)
    public ResponseEntity<Map<String, Object>> handleLessonLocked(LessonLockedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("error", "LESSON_LOCKED");
        body.put("message", ex.getMessage());
        body.put("lockedBy", ex.getLockedBy());
        body.put("lockedByName", ex.getLockedByName());
        body.put("lockedAt", ex.getLockedAt() != null ? ex.getLockedAt().toString() : null);
        body.put("expiresAt", ex.getExpiresAt() != null ? ex.getExpiresAt().toString() : null);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(GoneException.class)
    public ResponseEntity<Map<String, Object>> handleGone(GoneException ex) {
        return build(HttpStatus.GONE, ex.getMessage());
    }

    @ExceptionHandler(TotpRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleTotpRequired(TotpRequiredException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "TOTP_REQUIRED");
        body.put("message", ex.getMessage());
        body.put("pendingToken", ex.getPendingToken());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<Map<String, Object>> handleRateLimit(RateLimitException ex) {
        return build(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
    }

    /**
     * Services validate some inputs with plain IllegalArgumentException (invalid date
     * format, unknown theme preset...). Without this it falls through to handleGeneric()
     * and surfaces as a 500, hiding real server errors and misleading the client.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fields.put(error.getField(), error.getDefaultMessage());
        }
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Validation failed");
        body.put("fields", fields);
        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Never echo ex.getMessage() here: for a truly unhandled exception (NPE, SQL
     * constraint violation, Hibernate lazy-init failure...) that text is a raw Java/JDBC
     * message, in English, sometimes naming internal classes or table columns — not
     * something to show a learner. Log the real exception for us, return a generic
     * French message for them.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Erreur interne non gérée", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur inattendue est survenue. Veuillez réessayer.");
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
