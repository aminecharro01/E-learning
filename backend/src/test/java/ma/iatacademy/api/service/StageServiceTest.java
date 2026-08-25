package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.LearnerDocument;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.LearnerDocType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.dto.stage.LearnerDossierResponse;
import ma.iatacademy.api.dto.stage.UploadLearnerDocumentRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LearnerDocumentRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StageServiceTest {

    @Mock
    private LearnerDocumentRepository documentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AssetRepository assetRepository;
    @Mock
    private MediaService mediaService;

    @InjectMocks
    private StageService stageService;

    @Test
    void learnerCannotViewAnotherLearnersDossier() {
        UUID learnerId = UUID.randomUUID();
        UUID viewerId = UUID.randomUUID();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.ETUDIANT).build()));
        User viewer = User.builder().id(viewerId).role(Role.ETUDIANT).build();

        assertThrows(ForbiddenException.class,
                () -> stageService.getDossier(learnerId, new UserPrincipal(viewer)));
    }

    @Test
    void staffCanViewAnyLearnersDossier() {
        UUID learnerId = UUID.randomUUID();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.ETUDIANT).fullName("Learner").build()));
        when(documentRepository.findByLearnerIdOrderByCreatedAtDesc(learnerId)).thenReturn(List.of());
        User formateur = User.builder().id(UUID.randomUUID()).role(Role.FORMATEUR).build();

        LearnerDossierResponse dossier = stageService.getDossier(learnerId, new UserPrincipal(formateur));

        assertFalse(dossier.stageComplete());
    }

    @Test
    void learnerCannotUploadDirectorDocument() {
        UUID learnerId = UUID.randomUUID();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.ETUDIANT).build()));
        User learner = User.builder().id(learnerId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(learner);
        UploadLearnerDocumentRequest request = new UploadLearnerDocumentRequest(
                LearnerDocType.CONVENTION_ECOLE, UUID.randomUUID(), null);

        assertThrows(ForbiddenException.class, () -> stageService.upload(learnerId, request, principal));
    }

    @Test
    void staffCanUploadDirectorDocument() {
        UUID learnerId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.ETUDIANT).build()));
        when(userRepository.findById(staffId)).thenReturn(Optional.of(
                User.builder().id(staffId).role(Role.ADMIN).build()));
        Asset asset = Asset.builder().id(assetId).filename("convention.pdf").mimeType("application/pdf").build();
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(documentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(mediaService.createSignedStreamTrusted(assetId)).thenReturn(new SignedStreamResponse("/url", 0));

        User staff = User.builder().id(staffId).role(Role.ADMIN).build();
        UploadLearnerDocumentRequest request = new UploadLearnerDocumentRequest(
                LearnerDocType.CONVENTION_ECOLE, assetId, "note");

        stageService.upload(learnerId, request, new UserPrincipal(staff));

        verify(mediaService, times(1)).claimOwnership(assetId, learnerId);
        verify(documentRepository, times(1)).save(any(LearnerDocument.class));
    }

    @Test
    void presentationMustBePdfOrPowerpoint() {
        UUID learnerId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.ETUDIANT).build()));
        Asset asset = Asset.builder().id(assetId).filename("presentation.docx").mimeType("application/msword").build();
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));

        User learner = User.builder().id(learnerId).role(Role.ETUDIANT).build();
        UploadLearnerDocumentRequest request = new UploadLearnerDocumentRequest(
                LearnerDocType.PRESENTATION_SOUTENANCE, assetId, null);

        assertThrows(ApiException.class,
                () -> stageService.upload(learnerId, request, new UserPrincipal(learner)));
    }

    @Test
    void deleteRejectsWhenLearnerTriesToDeleteDirectorDocument() {
        UUID docId = UUID.randomUUID();
        UUID learnerId = UUID.randomUUID();
        User learner = User.builder().id(learnerId).role(Role.ETUDIANT).build();
        LearnerDocument doc = LearnerDocument.builder().id(docId)
                .docType(LearnerDocType.CONVENTION_ECOLE)
                .learner(learner)
                .uploadedBy(User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build())
                .build();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        assertThrows(ForbiddenException.class,
                () -> stageService.deleteDocument(docId, new UserPrincipal(learner)));
    }

    @Test
    void deleteSucceedsForStaff() {
        UUID docId = UUID.randomUUID();
        User learner = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build();
        LearnerDocument doc = LearnerDocument.builder().id(docId)
                .docType(LearnerDocType.CONVENTION_ECOLE)
                .learner(learner)
                .uploadedBy(User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build())
                .build();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        User admin = User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build();

        stageService.deleteDocument(docId, new UserPrincipal(admin));

        verify(documentRepository, times(1)).delete(doc);
    }
}
