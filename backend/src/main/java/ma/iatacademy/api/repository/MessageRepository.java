package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Batched "last message per conversation" for a conversation list — one round trip
     * instead of one query per conversation (see MessagingService#listMyConversations). */
    @Query(value = """
            SELECT DISTINCT ON (m.conversation_id) m.*
            FROM messages m
            WHERE m.conversation_id IN :conversationIds
            ORDER BY m.conversation_id, m.created_at DESC
            """, nativeQuery = true)
    List<Message> findLastMessagePerConversation(@Param("conversationIds") List<UUID> conversationIds);

    /** Batched unread count per conversation for one viewer — folds the "never read this
     * conversation" case in via the LEFT JOIN (NULL last_read_at counts everything as unread). */
    @Query(value = """
            SELECT m.conversation_id AS conversationId, COUNT(*) AS unreadCount
            FROM messages m
            LEFT JOIN conversation_participants cp
                ON cp.conversation_id = m.conversation_id AND cp.user_id = :viewerId
            WHERE m.conversation_id IN :conversationIds
              AND m.sender_id != :viewerId
              AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
            GROUP BY m.conversation_id
            """, nativeQuery = true)
    List<ConversationUnreadCount> countUnreadPerConversation(
            @Param("conversationIds") List<UUID> conversationIds,
            @Param("viewerId") UUID viewerId
    );

    interface ConversationUnreadCount {
        UUID getConversationId();
        Long getUnreadCount();
    }
}
