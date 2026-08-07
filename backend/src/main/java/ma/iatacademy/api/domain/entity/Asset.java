package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Asset extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "mime_type", nullable = false, length = 120)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "asset_kind", nullable = false, length = 30)
    private String assetKind; // VIDEO, PDF, IMAGE, SLIDE

    @Column(name = "duration_sec")
    private Integer durationSec;

    // Null means shared/public to any authenticated user (e.g. lesson media authored
    // by admin/formateur). Set when the asset becomes a personal document (stage
    // documents, avatars) so access can be restricted to the owner + staff.
    @Column(name = "owner_id")
    private UUID ownerId;
}
