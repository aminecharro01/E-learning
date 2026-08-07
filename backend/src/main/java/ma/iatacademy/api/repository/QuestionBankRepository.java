package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.QuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionBankRepository extends JpaRepository<QuestionBank, UUID> {
    List<QuestionBank> findAllByOrderByCreatedAtDesc();
}
