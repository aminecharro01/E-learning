package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("""
            SELECT n FROM Notification n
            WHERE n.user.id = :userId
            ORDER BY CASE WHEN n.readAt IS NULL THEN 0 ELSE 1 END, n.createdAt DESC
            """)
    Page<Notification> findByUserIdUnreadFirst(@Param("userId") UUID userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(UUID userId);
}
