package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    Page<User> findByRole(Role role, Pageable pageable);

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
}
