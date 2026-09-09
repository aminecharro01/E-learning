package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Conversation;
import ma.iatacademy.api.domain.enums.ConversationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    Optional<Conversation> findByGroupId(UUID groupId);

    List<Conversation> findByType(ConversationType type);
}
