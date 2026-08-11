package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.MediaFolder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MediaFolderRepository extends JpaRepository<MediaFolder, UUID> {
    List<MediaFolder> findByParentIdOrderByNameAsc(UUID parentId);

    List<MediaFolder> findByParentIdIsNullOrderByNameAsc();
}
