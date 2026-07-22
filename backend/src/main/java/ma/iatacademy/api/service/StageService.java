package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.LearnerDocument;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.LearnerDocStatus;
import ma.iatacademy.api.domain.enums.LearnerDocType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.stage.LearnerDocumentResponse;
import ma.iatacademy.api.dto.stage.LearnerDossierResponse;
import ma.iatacademy.api.dto.stage.UploadLearnerDocumentRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LearnerDocumentRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StageService {

    private static final Set<LearnerDocType> DIRECTOR_TYPES = EnumSet.of(
            LearnerDocType.CONVENTION_ECOLE,
            LearnerDocType.ASSURANCE
    );
    private static final Set<LearnerDocType> LEARNER_TYPES = EnumSet.of(
            LearnerDocType.CONVENTION_ENTREPRISE,
            LearnerDocType.RAPPORT_STAGE,
            LearnerDocType.PRESENTATION_SOUTENANCE
    );

    private final LearnerDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final MediaService mediaService;

    @Transactional(readOnly = true)
    public LearnerDossierResponse getMyDossier(UserPrincipal principal) {
        return getDossier(principal.getId(), principal);
    }

    @Transactional(readOnly = true)
    public LearnerDossierResponse getDossier(UUID learnerId, UserPrincipal viewer) {
        User learner = requireLearner(learnerId);
        assertCanView(viewer, learnerId);
        List<LearnerDocument> docs = documentRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId);
        return toDossier(learner, docs);
    }

    @Transactional(readOnly = true)
    public List<LearnerDossierResponse> listDossiers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ETUDIANT)
                .map(u -> toDossier(u, documentRepository.findByLearnerIdOrderByCreatedAtDesc(u.getId())))
                .toList();
    }

    @Transactional
    public LearnerDocumentResponse upload(
            UUID learnerId,
            UploadLearnerDocumentRequest request,
            UserPrincipal principal
    ) {
        User learner = requireLearner(learnerId);
        User uploader = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        assertCanUpload(principal, learnerId, request.docType());

        Asset asset = assetRepository.findById(request.assetId())
                .orElseThrow(() -> new NotFoundException("Fichier introuvable."));

        if (request.docType() == LearnerDocType.PRESENTATION_SOUTENANCE) {
            assertPresentationFormat(asset);
        }

        LearnerDocument doc = LearnerDocument.builder()
                .learner(learner)
                .docType(request.docType())
                .asset(asset)
                .uploadedBy(uploader)
                .notes(request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null)
                .status(LearnerDocStatus.SUBMITTED)
                .build();
        return toDocResponse(documentRepository.save(doc));
    }

    private void assertPresentationFormat(Asset asset) {
        String name = asset.getFilename() != null ? asset.getFilename().toLowerCase() : "";
        String mime = asset.getMimeType() != null ? asset.getMimeType().toLowerCase() : "";
        boolean ok = name.endsWith(".pdf")
                || name.endsWith(".ppt")
                || name.endsWith(".pptx")
                || mime.contains("pdf")
                || mime.contains("powerpoint")
                || mime.contains("presentation");
        if (!ok) {
            throw new ApiException("La présentation doit être un fichier PDF ou PowerPoint (.ppt / .pptx).");
        }
    }

    @Transactional
    public void deleteDocument(UUID documentId, UserPrincipal principal) {
        LearnerDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Document introuvable."));
        boolean staff = principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR;
        boolean owner = doc.getUploadedBy().getId().equals(principal.getId())
                || doc.getLearner().getId().equals(principal.getId());
        if (!staff && !owner) {
            throw new ForbiddenException("Suppression non autorisée.");
        }
        if (!staff && LEARNER_TYPES.contains(doc.getDocType())
                && !doc.getLearner().getId().equals(principal.getId())) {
            throw new ForbiddenException("Suppression non autorisée.");
        }
        if (!staff && DIRECTOR_TYPES.contains(doc.getDocType())) {
            throw new ForbiddenException("Seul l'académie peut supprimer ce document.");
        }
        documentRepository.delete(doc);
    }

    private void assertCanView(UserPrincipal viewer, UUID learnerId) {
        if (viewer.getRole() == Role.ADMIN || viewer.getRole() == Role.FORMATEUR) {
            return;
        }
        if (!viewer.getId().equals(learnerId)) {
            throw new ForbiddenException("Accès au dossier refusé.");
        }
    }

    private void assertCanUpload(UserPrincipal principal, UUID learnerId, LearnerDocType type) {
        boolean staff = principal.getRole() == Role.ADMIN || principal.getRole() == Role.FORMATEUR;
        if (DIRECTOR_TYPES.contains(type)) {
            if (!staff) {
                throw new ForbiddenException("Seul le directeur / formateur peut déposer ce document.");
            }
            return;
        }
        if (LEARNER_TYPES.contains(type)) {
            if (staff) {
                return; // staff may help upload for learner
            }
            if (!principal.getId().equals(learnerId) || principal.getRole() != Role.ETUDIANT) {
                throw new ForbiddenException("Seul l'apprenant concerné peut déposer ce document.");
            }
            return;
        }
        throw new ApiException("Type de document inconnu.");
    }

    private User requireLearner(UUID learnerId) {
        User learner = userRepository.findById(learnerId)
                .orElseThrow(() -> new NotFoundException("Apprenant introuvable."));
        if (learner.getRole() != Role.ETUDIANT) {
            throw new ApiException("Le dossier Stage concerne uniquement les apprenants.");
        }
        return learner;
    }

    private LearnerDossierResponse toDossier(User learner, List<LearnerDocument> docs) {
        List<LearnerDossierResponse.SlotStatus> slots = new ArrayList<>();
        slots.add(slot(LearnerDocType.CONVENTION_ECOLE, "Convention école (signée)", "DIRECTOR", "STAGE", true, docs));
        slots.add(slot(LearnerDocType.ASSURANCE, "Attestation d'assurance", "DIRECTOR", "STAGE", true, docs));
        slots.add(slot(LearnerDocType.CONVENTION_ENTREPRISE, "Convention signée entreprise", "LEARNER", "STAGE", true, docs));
        slots.add(slot(LearnerDocType.RAPPORT_STAGE, "Rapport de stage", "LEARNER", "STAGE", true, docs));
        slots.add(slot(LearnerDocType.PRESENTATION_SOUTENANCE, "Présentation soutenance", "LEARNER", "SOUTENANCE", true, docs));

        boolean stageComplete = slots.stream()
                .filter(s -> "STAGE".equals(s.section()))
                .allMatch(LearnerDossierResponse.SlotStatus::filled);
        boolean soutenanceComplete = slots.stream()
                .filter(s -> "SOUTENANCE".equals(s.section()))
                .allMatch(LearnerDossierResponse.SlotStatus::filled);

        return new LearnerDossierResponse(
                learner.getId(),
                learner.getFullName() != null ? learner.getFullName() : learner.getEmail(),
                learner.getEmail(),
                stageComplete,
                soutenanceComplete,
                slots,
                docs.stream().map(this::toDocResponse).toList()
        );
    }

    private LearnerDossierResponse.SlotStatus slot(
            LearnerDocType type,
            String label,
            String owner,
            String section,
            boolean required,
            List<LearnerDocument> docs
    ) {
        LearnerDocument latest = docs.stream()
                .filter(d -> d.getDocType() == type)
                .findFirst()
                .orElse(null);
        return new LearnerDossierResponse.SlotStatus(
                type.name(),
                label,
                owner,
                section,
                required,
                latest != null,
                latest != null ? latest.getId() : null
        );
    }

    private LearnerDocumentResponse toDocResponse(LearnerDocument doc) {
        var stream = mediaService.createSignedStream(doc.getAsset().getId());
        return new LearnerDocumentResponse(
                doc.getId(),
                doc.getLearner().getId(),
                doc.getDocType(),
                doc.getStatus(),
                doc.getAsset().getId(),
                doc.getAsset().getFilename(),
                doc.getAsset().getMimeType(),
                stream.url(),
                doc.getNotes(),
                doc.getUploadedBy().getId(),
                doc.getUploadedBy().getFullName() != null
                        ? doc.getUploadedBy().getFullName()
                        : doc.getUploadedBy().getEmail(),
                doc.getCreatedAt()
        );
    }
}
