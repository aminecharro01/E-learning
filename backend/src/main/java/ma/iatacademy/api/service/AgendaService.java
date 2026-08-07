package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.entity.VirtualSession;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.dto.agenda.AgendaItemResponse;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.repository.VirtualSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Aggregates forward-looking dates the learner already has (quiz attempt expiry,
 * retry cooldown, année 2 opening) into one sorted list — no new "deadline" entity,
 * these all already exist scattered across the domain.
 */
@Service
@RequiredArgsConstructor
public class AgendaService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final AppPlatformProperties appPlatformProperties;
    private final VirtualSessionRepository virtualSessionRepository;

    @Transactional(readOnly = true)
    public List<AgendaItemResponse> myAgenda(UUID userId) {
        Instant now = Instant.now();
        List<AgendaItemResponse> items = new ArrayList<>();

        List<QuizAttempt> attempts = quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(
                userId, List.of(AttemptStatus.IN_PROGRESS, AttemptStatus.FAILED, AttemptStatus.EXPIRED));

        attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS
                        && a.getExpiresAt() != null && a.getExpiresAt().isAfter(now))
                .forEach(a -> items.add(new AgendaItemResponse(
                        "QUIZ_EXPIRING", "Quiz en cours : " + a.getQuiz().getTitle(), a.getExpiresAt(), "/app")));

        Map<UUID, QuizAttempt> latestFailedByQuiz = new LinkedHashMap<>();
        attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.FAILED || a.getStatus() == AttemptStatus.EXPIRED)
                .forEach(a -> latestFailedByQuiz.putIfAbsent(a.getQuiz().getId(), a));

        for (QuizAttempt a : latestFailedByQuiz.values()) {
            Quiz quiz = a.getQuiz();
            if (quiz.getRetryDelayHours() <= 0) {
                continue;
            }
            Instant base = a.getSubmittedAt() != null ? a.getSubmittedAt() : a.getStartedAt();
            Instant earliest = base.plus(Duration.ofHours(quiz.getRetryDelayHours()));
            if (earliest.isAfter(now)) {
                items.add(new AgendaItemResponse(
                        "QUIZ_RETRY", "Nouvelle tentative possible : " + quiz.getTitle(), earliest, "/app"));
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));

        if (user.getGroup() != null) {
            for (VirtualSession session : virtualSessionRepository.findByGroupIdOrderByScheduledAtAsc(user.getGroup().getId())) {
                if (session.getScheduledAt().isAfter(now)) {
                    items.add(new AgendaItemResponse(
                            "VIRTUAL_SESSION", "Session live : " + session.getTitle(), session.getScheduledAt(), session.getJoinUrl()));
                }
            }
        }

        String openingDate = appPlatformProperties.getYear2OpeningDate();
        if (!user.isYear2AccessEnabled() && openingDate != null && !openingDate.isBlank()) {
            try {
                Instant at = LocalDate.parse(openingDate).atStartOfDay(ZoneOffset.UTC).toInstant();
                if (at.isAfter(now)) {
                    items.add(new AgendaItemResponse("YEAR2_OPENING", "Ouverture de l'année 2", at, "/app"));
                }
            } catch (DateTimeParseException ignored) {
                // Malformed admin-entered date — skip this item rather than fail the whole agenda.
            }
        }

        items.sort(Comparator.comparing(AgendaItemResponse::at));
        return items;
    }
}
