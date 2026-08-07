package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.EmailCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailCampaignRepository extends JpaRepository<EmailCampaign, UUID> {
    List<EmailCampaign> findAllByOrderByCreatedAtDesc();
}
