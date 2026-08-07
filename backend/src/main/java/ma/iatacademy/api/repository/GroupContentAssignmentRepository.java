package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.GroupContentAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupContentAssignmentRepository extends JpaRepository<GroupContentAssignment, UUID> {

    List<GroupContentAssignment> findByGroupIdOrderByCreatedAtDesc(UUID groupId);

    Optional<GroupContentAssignment> findByGroupIdAndModuleId(UUID groupId, UUID moduleId);

    /** Accès effectif : affectation existante et déjà ouverte (immédiate ou date atteinte). */
    @Query("""
            SELECT COUNT(a) > 0 FROM GroupContentAssignment a
            WHERE a.group.id = :groupId
              AND a.module.id = :moduleId
              AND (a.unlockAt IS NULL OR a.unlockAt <= :now)
            """)
    boolean isUnlocked(@Param("groupId") UUID groupId,
                       @Param("moduleId") UUID moduleId,
                       @Param("now") Instant now);
}
