package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LearnerDocument;
import ma.iatacademy.api.domain.enums.LearnerDocType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LearnerDocumentRepository extends JpaRepository<LearnerDocument, UUID> {
    List<LearnerDocument> findByLearnerIdOrderByCreatedAtDesc(UUID learnerId);

    Optional<LearnerDocument> findFirstByLearnerIdAndDocTypeOrderByCreatedAtDesc(
            UUID learnerId, LearnerDocType docType);

    void deleteByIdAndLearnerId(UUID id, UUID learnerId);
}
