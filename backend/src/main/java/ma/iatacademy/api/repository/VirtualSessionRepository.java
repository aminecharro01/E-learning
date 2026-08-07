package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.VirtualSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface VirtualSessionRepository extends JpaRepository<VirtualSession, UUID> {
    List<VirtualSession> findByGroupIdOrderByScheduledAtAsc(UUID groupId);
    List<VirtualSession> findByReminderSentFalseAndScheduledAtBetween(Instant from, Instant to);
}
