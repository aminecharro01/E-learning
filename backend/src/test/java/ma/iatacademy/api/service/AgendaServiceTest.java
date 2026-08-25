package ma.iatacademy.api.service;

import ma.iatacademy.api.config.AppPlatformProperties;
import ma.iatacademy.api.domain.entity.Quiz;
import ma.iatacademy.api.domain.entity.QuizAttempt;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.dto.agenda.AgendaItemResponse;
import ma.iatacademy.api.repository.QuizAttemptRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.repository.VirtualSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgendaServiceTest {

    @Mock
    private QuizAttemptRepository quizAttemptRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AppPlatformProperties appPlatformProperties;
    @Mock
    private VirtualSessionRepository virtualSessionRepository;

    @InjectMocks
    private AgendaService agendaService;

    @Test
    void includesInProgressQuizStillWithinTimeLimit() {
        UUID userId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).title("Quiz A").build();
        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .status(AttemptStatus.IN_PROGRESS)
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .build();
        when(quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(eq(userId), any()))
                .thenReturn(List.of(attempt));
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        lenient().when(appPlatformProperties.getYear2OpeningDate()).thenReturn(null);

        List<AgendaItemResponse> items = agendaService.myAgenda(userId);

        assertTrue(items.stream().anyMatch(i -> i.type().equals("QUIZ_EXPIRING")));
    }

    @Test
    void excludesAlreadyExpiredInProgressAttempt() {
        UUID userId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).title("Quiz B").build();
        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .status(AttemptStatus.IN_PROGRESS)
                .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES))
                .build();
        when(quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(eq(userId), any()))
                .thenReturn(List.of(attempt));
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        lenient().when(appPlatformProperties.getYear2OpeningDate()).thenReturn(null);

        List<AgendaItemResponse> items = agendaService.myAgenda(userId);

        assertTrue(items.stream().noneMatch(i -> i.type().equals("QUIZ_EXPIRING")));
    }

    @Test
    void includesRetryCooldownStillPending() {
        UUID userId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).title("Quiz C").retryDelayMinutes(1440).build();
        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .status(AttemptStatus.FAILED)
                .submittedAt(Instant.now())
                .build();
        when(quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(eq(userId), any()))
                .thenReturn(List.of(attempt));
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        lenient().when(appPlatformProperties.getYear2OpeningDate()).thenReturn(null);

        List<AgendaItemResponse> items = agendaService.myAgenda(userId);

        assertTrue(items.stream().anyMatch(i -> i.type().equals("QUIZ_RETRY")));
    }

    @Test
    void skipsRetryItemWhenRetryDelayIsZero() {
        UUID userId = UUID.randomUUID();
        Quiz quiz = Quiz.builder().id(UUID.randomUUID()).title("Quiz D").retryDelayMinutes(0).build();
        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .status(AttemptStatus.FAILED)
                .submittedAt(Instant.now())
                .build();
        when(quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(eq(userId), any()))
                .thenReturn(List.of(attempt));
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        lenient().when(appPlatformProperties.getYear2OpeningDate()).thenReturn(null);

        List<AgendaItemResponse> items = agendaService.myAgenda(userId);

        assertTrue(items.stream().noneMatch(i -> i.type().equals("QUIZ_RETRY")));
    }

    @Test
    void ignoresMalformedYear2OpeningDate() {
        UUID userId = UUID.randomUUID();
        when(quizAttemptRepository.findByUserIdAndStatusInOrderByStartedAtDesc(eq(userId), any()))
                .thenReturn(List.of());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        when(appPlatformProperties.getYear2OpeningDate()).thenReturn("not-a-date");

        List<AgendaItemResponse> items = agendaService.myAgenda(userId);

        assertEquals(0, items.size());
    }
}
