package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<User> findByResetToken(String resetToken);
    Optional<User> findByVerificationToken(String verificationToken);
    List<User> findByGroupIdOrderByFullNameAsc(UUID groupId);
    long countByGroupId(UUID groupId);
    Optional<User> findByMatriculeIgnoreCase(String matricule);
    boolean existsByMatriculeIgnoreCase(String matricule);

    Page<User> findByRole(Role role, Pageable pageable);
    List<User> findByRole(Role role);

    @Query("""
            SELECT u FROM User u
            WHERE u.role = :role
              AND (
                LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
              )
            """)
    Page<User> searchByRoleAndQuery(
            @Param("role") Role role,
            @Param("q") String q,
            Pageable pageable
    );

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
            """)
    Page<User> searchByQuery(@Param("q") String q, Pageable pageable);

    long countByRoleAndEnabledTrue(Role role);
}
