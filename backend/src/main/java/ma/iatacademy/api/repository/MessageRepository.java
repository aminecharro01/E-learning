package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    List<Message> findByConversationIdAndCreatedAtAfterOrderByCreatedAtAsc(UUID conversationId, Instant since);

    /** Unread count when the viewer has never opened the conversation (no last-read marker yet). */
    long countByConversationIdAndSenderIdNot(UUID conversationId, UUID senderId);

    /** Unread count since the viewer's last-read marker. */
    long countByConversationIdAndSenderIdNotAndCreatedAtAfter(UUID conversationId, UUID senderId, Instant after);
}
