package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.GradeAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GradeAdjustmentRepository extends JpaRepository<GradeAdjustment, UUID> {
    List<GradeAdjustment> findByModuleId(UUID moduleId);
    List<GradeAdjustment> findByUserIdAndModuleId(UUID userId, UUID moduleId);
}
