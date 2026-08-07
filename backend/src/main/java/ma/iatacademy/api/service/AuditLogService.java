package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.AuditLogEntry;
import ma.iatacademy.api.dto.admin.AuditLogEntryResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.repository.AuditLogRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /** Append-only insert — called from existing sensitive AdminService call sites. */
    @Transactional
    public void record(UUID actorId, String action, String targetType, UUID targetId, String metadata) {
        AuditLogEntry entry = AuditLogEntry.builder()
                .actor(actorId != null ? userRepository.getReferenceById(actorId) : null)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .metadata(metadata)
                .build();
        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogEntryResponse> list(int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<AuditLogEntry> result = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        return PageResponse.from(result.map(this::toResponse));
    }

    private AuditLogEntryResponse toResponse(AuditLogEntry e) {
        String actorName = e.getActor() != null
                ? (e.getActor().getFullName() != null ? e.getActor().getFullName() : e.getActor().getEmail())
                : "Système";
        return new AuditLogEntryResponse(
                e.getId(), actorName, e.getAction(), e.getTargetType(), e.getTargetId(), e.getMetadata(),
                e.getCreatedAt());
    }
}
