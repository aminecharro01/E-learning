package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.UserBadge;
import ma.iatacademy.api.domain.enums.BadgeCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UUID> {
    boolean existsByUserIdAndBadgeCode(UUID userId, BadgeCode badgeCode);
    List<UserBadge> findByUserIdOrderByAwardedAtDesc(UUID userId);
}
