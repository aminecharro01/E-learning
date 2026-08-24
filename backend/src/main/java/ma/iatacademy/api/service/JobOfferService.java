package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;
import ma.iatacademy.api.domain.entity.JobOffer;
import ma.iatacademy.api.dto.job.CreateJobOfferRequest;
import ma.iatacademy.api.dto.job.JobOfferResponse;
import ma.iatacademy.api.dto.job.UpdateJobOfferRequest;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.CertificateRepository;
import ma.iatacademy.api.repository.JobOfferRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Bourse à l'emploi réservée aux diplômés — "alumni" n'est pas un champ dédié sur User,
 * c'est dérivé de l'existence d'un Certificate pour la formation (déjà la preuve que le
 * parcours complet des 36 modules est validé). Publication réservée à Admin/Formateur
 * (voir JobOfferController), sur le même modèle CRUD que EmailCampaignService.
 */
@Service
@RequiredArgsConstructor
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final UserRepository userRepository;
    private final CertificateRepository certificateRepository;

    @Transactional
    public JobOfferResponse create(CreateJobOfferRequest request, UUID actorId) {
        JobOffer offer = JobOffer.builder()
                .title(request.title().trim())
                .company(request.company().trim())
                .description(request.description())
                .location(request.location())
                .contractType(request.contractType())
                .applyUrl(request.applyUrl())
                .contactEmail(request.contactEmail())
                .photoAssetId(request.photoAssetId())
                .postedBy(userRepository.getReferenceById(actorId))
                .published(true)
                .expiresAt(request.expiresAt())
                .build();
        jobOfferRepository.save(offer);
        return toResponse(offer);
    }

    @Transactional
    public JobOfferResponse update(UUID id, UpdateJobOfferRequest request) {
        JobOffer offer = requireOffer(id);
        offer.setTitle(request.title().trim());
        offer.setCompany(request.company().trim());
        offer.setDescription(request.description());
        offer.setLocation(request.location());
        offer.setContractType(request.contractType());
        offer.setApplyUrl(request.applyUrl());
        offer.setContactEmail(request.contactEmail());
        offer.setPhotoAssetId(request.photoAssetId());
        offer.setPublished(request.published());
        offer.setExpiresAt(request.expiresAt());
        return toResponse(offer);
    }

    @Transactional
    public void delete(UUID id) {
        jobOfferRepository.delete(requireOffer(id));
    }

    @Transactional(readOnly = true)
    public List<JobOfferResponse> listAll() {
        return jobOfferRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    /** Réservé aux diplômés (voir la doc de classe) — lève ForbiddenException sinon. */
    @Transactional(readOnly = true)
    public List<JobOfferResponse> listForLearner(UUID userId) {
        boolean isAlumni = certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID).isPresent();
        if (!isAlumni) {
            throw new ForbiddenException("Réservé aux diplômés.");
        }
        return jobOfferRepository.findActive(Instant.now()).stream().map(this::toResponse).toList();
    }

    private JobOffer requireOffer(UUID id) {
        return jobOfferRepository.findById(id).orElseThrow(() -> new NotFoundException("Offre introuvable."));
    }

    private JobOfferResponse toResponse(JobOffer o) {
        return new JobOfferResponse(
                o.getId(), o.getTitle(), o.getCompany(), o.getDescription(), o.getLocation(),
                o.getContractType(), o.getApplyUrl(), o.getContactEmail(), o.getPhotoAssetId(), o.isPublished(),
                o.getExpiresAt(), o.getCreatedAt()
        );
    }
}
