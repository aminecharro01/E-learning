package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByGroupId(UUID groupId);
}
