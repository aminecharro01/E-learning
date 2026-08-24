package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Certificate;
import ma.iatacademy.api.domain.entity.JobOffer;
import ma.iatacademy.api.domain.enums.ContractType;
import ma.iatacademy.api.dto.job.JobOfferResponse;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.repository.CertificateRepository;
import ma.iatacademy.api.repository.JobOfferRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobOfferServiceTest {

    @Mock
    private JobOfferRepository jobOfferRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CertificateRepository certificateRepository;

    @InjectMocks
    private JobOfferService jobOfferService;

    @Test
    void listForLearnerRejectsNonGraduate() {
        UUID userId = UUID.randomUUID();
        when(certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID))
                .thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> jobOfferService.listForLearner(userId));
    }

    @Test
    void listForLearnerReturnsActiveOffersForGraduate() {
        UUID userId = UUID.randomUUID();
        when(certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID))
                .thenReturn(Optional.of(Certificate.builder().id(UUID.randomUUID()).build()));
        JobOffer offer = JobOffer.builder()
                .id(UUID.randomUUID())
                .title("Agent d'escale")
                .company("IAT Airlines")
                .description("Description")
                .contractType(ContractType.CDI)
                .published(true)
                .build();
        when(jobOfferRepository.findActive(any(Instant.class))).thenReturn(List.of(offer));

        List<JobOfferResponse> results = jobOfferService.listForLearner(userId);

        assertEquals(1, results.size());
        assertEquals("Agent d'escale", results.get(0).title());
    }
}
