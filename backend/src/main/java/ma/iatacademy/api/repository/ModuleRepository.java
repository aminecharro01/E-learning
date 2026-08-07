package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.ModuleEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ModuleRepository extends JpaRepository<ModuleEntity, UUID> {
    List<ModuleEntity> findByFormationIdOrderByOrderIndexAsc(UUID formationId);

    @Query("""
            SELECT m FROM ModuleEntity m
            WHERE m.published = true AND LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%'))
            """)
    List<ModuleEntity> searchPublishedByTitle(@Param("q") String q, Pageable pageable);
}
