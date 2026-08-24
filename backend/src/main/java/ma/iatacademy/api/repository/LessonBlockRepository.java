package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.LessonBlock;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonBlockRepository extends JpaRepository<LessonBlock, UUID> {
    List<LessonBlock> findByLessonIdOrderByOrderIndexAsc(UUID lessonId);

    /** Used to append a new block after whatever the current highest order_index is —
     * never trust the client's guess, see LessonService#createBlock. */
    Optional<LessonBlock> findTopByLessonIdOrderByOrderIndexDesc(UUID lessonId);

    /** Global search — TEXT blocks store rich HTML in content.body (see BlockEditor.tsx). */
    @Query(value = """
            SELECT lb.* FROM lesson_blocks lb
            JOIN lessons l ON l.id = lb.lesson_id
            WHERE l.published = true AND lb.block_type = 'TEXT'
              AND (lb.content ->> 'body') ILIKE CONCAT('%', :q, '%')
            """, nativeQuery = true)
    List<LessonBlock> searchPublishedTextBlocks(@Param("q") String q, Pageable pageable);

    /** Global search — PDF blocks only reference content.assetId; the actual text lives
     * on the joined Asset row's extracted_text (populated by MediaService#upload). */
    @Query(value = """
            SELECT lb.* FROM lesson_blocks lb
            JOIN lessons l ON l.id = lb.lesson_id
            JOIN assets a ON a.id = (lb.content ->> 'assetId')::uuid
            WHERE l.published = true AND lb.block_type = 'PDF'
              AND a.extracted_text ILIKE CONCAT('%', :q, '%')
            """, nativeQuery = true)
    List<LessonBlock> searchPublishedPdfBlocks(@Param("q") String q, Pageable pageable);
}
