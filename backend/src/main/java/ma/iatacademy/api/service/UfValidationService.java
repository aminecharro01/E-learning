package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.LearnerUfValidation;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.stage.UfValidationResponse;
import ma.iatacademy.api.dto.stage.ValidateUfRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LearnerUfValidationRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UfValidationService {

    public static final Set<String> DIRECTOR_GATED_UFS = Set.of("UF 5", "UF 11");

    private final LearnerUfValidationRepository validationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public boolean isValidated(UUID learnerId, String ufCode) {
        if (!DIRECTOR_GATED_UFS.contains(ufCode)) {
            return true;
        }
        return validationRepository.findByLearnerIdAndUfCode(learnerId, ufCode)
                .map(LearnerUfValidation::isValidated)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<UfValidationResponse> listForLearner(UUID learnerId) {
        return DIRECTOR_GATED_UFS.stream()
                .map(code -> validationRepository.findByLearnerIdAndUfCode(learnerId, code)
                        .map(this::toResponse)
                        .orElseGet(() -> new UfValidationResponse(code, false, null, null, null)))
                .toList();
    }

    @Transactional
    public UfValidationResponse validate(UUID learnerId, ValidateUfRequest request, UserPrincipal principal) {
        if (principal.getRole() != Role.ADMIN && principal.getRole() != Role.FORMATEUR) {
            throw new ForbiddenException("Seule l'académie peut valider une unité.");
        }
        String ufCode = request.ufCode().trim();
        if (!DIRECTOR_GATED_UFS.contains(ufCode)) {
            throw new ApiException("Seules les unités UF 5 (Stage) et UF 11 (Soutenance) nécessitent une validation.");
        }
        User learner = userRepository.findById(learnerId)
                .orElseThrow(() -> new NotFoundException("Apprenant introuvable."));
        if (learner.getRole() != Role.ETUDIANT) {
            throw new ApiException("Validation réservée aux apprenants.");
        }
        User director = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));

        LearnerUfValidation row = validationRepository.findByLearnerIdAndUfCode(learnerId, ufCode)
                .orElseGet(() -> LearnerUfValidation.builder()
                        .learner(learner)
                        .ufCode(ufCode)
                        .build());
        row.setValidated(Boolean.TRUE.equals(request.validated()));
        row.setValidatedAt(row.isValidated() ? Instant.now() : null);
        row.setValidatedBy(row.isValidated() ? director : null);
        row.setNote(request.note() != null && !request.note().isBlank() ? request.note().trim() : null);
        return toResponse(validationRepository.save(row));
    }

    private UfValidationResponse toResponse(LearnerUfValidation row) {
        String by = null;
        if (row.getValidatedBy() != null) {
            by = row.getValidatedBy().getFullName() != null
                    ? row.getValidatedBy().getFullName()
                    : row.getValidatedBy().getEmail();
        }
        return new UfValidationResponse(
                row.getUfCode(),
                row.isValidated(),
                row.getValidatedAt(),
                by,
                row.getNote()
        );
    }
}
