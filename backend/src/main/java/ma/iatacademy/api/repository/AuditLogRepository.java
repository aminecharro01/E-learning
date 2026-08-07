package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.AuditLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, UUID> {
    Page<AuditLogEntry> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
