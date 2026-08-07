package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.ContactMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, UUID> {

    long countByStatus(String status);

    @Query("""
            SELECT c FROM ContactMessage c
            WHERE (:q IS NULL OR :q = ''
               OR LOWER(c.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
               OR LOWER(c.firstName) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
               OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
               OR LOWER(c.phone) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
               OR LOWER(c.message) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            AND (:status IS NULL OR :status = '' OR c.status = :status)
            """)
    Page<ContactMessage> search(
            @Param("q") String q,
            @Param("status") String status,
            Pageable pageable
    );
}
