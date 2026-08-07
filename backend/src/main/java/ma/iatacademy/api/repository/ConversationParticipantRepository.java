package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, UUID> {
    List<ConversationParticipant> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<ConversationParticipant> findByConversationIdAndUserId(UUID conversationId, UUID userId);

    /** DIRECT : la conversation entre exactement ces deux utilisateurs, si elle existe déjà. */
    @org.springframework.data.jpa.repository.Query("""
            SELECT cp1.conversation.id FROM ConversationParticipant cp1
            JOIN ConversationParticipant cp2 ON cp2.conversation.id = cp1.conversation.id
            WHERE cp1.conversation.type = ma.iatacademy.api.domain.enums.ConversationType.DIRECT
              AND cp1.user.id = :userA AND cp2.user.id = :userB
            """)
    Optional<UUID> findDirectConversationId(
            @org.springframework.data.repository.query.Param("userA") UUID userA,
            @org.springframework.data.repository.query.Param("userB") UUID userB
    );
}
