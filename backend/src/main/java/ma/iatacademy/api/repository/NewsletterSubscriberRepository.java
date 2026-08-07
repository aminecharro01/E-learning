package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.NewsletterSubscriber;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, UUID> {

    Optional<NewsletterSubscriber> findByEmailIgnoreCase(String email);

    long countByActiveTrue();
    java.util.List<NewsletterSubscriber> findByActiveTrue();

    @Query("""
            SELECT n FROM NewsletterSubscriber n
            WHERE (:q IS NULL OR :q = ''
               OR LOWER(n.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            AND (:active IS NULL OR n.active = :active)
            """)
    Page<NewsletterSubscriber> search(
            @Param("q") String q,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
