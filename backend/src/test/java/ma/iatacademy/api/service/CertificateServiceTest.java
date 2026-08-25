package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.Certificate;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.CertificateRepository;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock
    private CertificateRepository certificateRepository;
    @Mock
    private FormationRepository formationRepository;
    @Mock
    private ModuleRepository moduleRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProgressionService progressionService;

    @InjectMocks
    private CertificateService certificateService;

    @TempDir
    Path tempDir;

    @Test
    void tryIssueIfEligibleSkipsWhenAlreadyIssued() {
        UUID userId = UUID.randomUUID();
        UUID formationId = UUID.randomUUID();
        when(certificateRepository.findByUserIdAndFormationId(userId, formationId))
                .thenReturn(Optional.of(Certificate.builder().id(UUID.randomUUID()).build()));

        certificateService.tryIssueIfEligible(userId, formationId);

        verify(moduleRepository, never()).findByFormationIdOrderByOrderIndexAsc(any());
        verify(certificateRepository, never()).save(any());
    }

    @Test
    void tryIssueIfEligibleSkipsWhenModulesIncomplete() {
        UUID userId = UUID.randomUUID();
        UUID formationId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        when(certificateRepository.findByUserIdAndFormationId(userId, formationId)).thenReturn(Optional.empty());
        when(moduleRepository.findByFormationIdOrderByOrderIndexAsc(formationId)).thenReturn(List.of(module));
        when(progressionService.isModuleCompleted(userId, module.getId())).thenReturn(false);

        certificateService.tryIssueIfEligible(userId, formationId);

        verify(certificateRepository, never()).save(any());
    }

    @Test
    void tryIssueIfEligibleIssuesWhenAllModulesDone() {
        ReflectionTestUtils.setField(certificateService, "mediaRoot", tempDir.toString());
        UUID userId = UUID.randomUUID();
        UUID formationId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        when(certificateRepository.findByUserIdAndFormationId(userId, formationId)).thenReturn(Optional.empty());
        when(moduleRepository.findByFormationIdOrderByOrderIndexAsc(formationId)).thenReturn(List.of(module));
        when(progressionService.isModuleCompleted(userId, module.getId())).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(
                User.builder().id(userId).email("learner@example.com").fullName("Learner One").build()));
        when(formationRepository.findById(formationId)).thenReturn(Optional.of(
                Formation.builder().id(formationId).title("Aviation").build()));
        when(certificateRepository.save(any(Certificate.class))).thenAnswer(inv -> inv.getArgument(0));

        certificateService.tryIssueIfEligible(userId, formationId);

        verify(certificateRepository, times(1)).save(any(Certificate.class));
    }

    @Test
    void getMineThrowsNotFoundWhenNoCertificate() {
        UUID userId = UUID.randomUUID();
        when(certificateRepository.findByUserIdAndFormationId(any(), any())).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> certificateService.getMine(userId));
    }

    @Test
    void verifyThrowsNotFoundForInvalidCode() {
        when(certificateRepository.findByVerificationCode("BADCODE")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> certificateService.verify("BADCODE"));
    }

    @Test
    void verifyReturnsCertificateForValidCode() {
        Certificate certificate = Certificate.builder().id(UUID.randomUUID()).verificationCode("GOODCODE").build();
        when(certificateRepository.findByVerificationCode("GOODCODE")).thenReturn(Optional.of(certificate));

        Certificate result = certificateService.verify("GOODCODE");

        assertEquals("GOODCODE", result.getVerificationCode());
    }

    @Test
    void issueReturnsExistingCertificateWithoutRegenerating() {
        UUID userId = UUID.randomUUID();
        UUID formationId = UUID.randomUUID();
        Certificate existing = Certificate.builder().id(UUID.randomUUID()).build();
        when(certificateRepository.findByUserIdAndFormationId(userId, formationId)).thenReturn(Optional.of(existing));

        Certificate result = certificateService.issue(userId, formationId);

        assertTrue(result == existing);
        verify(certificateRepository, never()).save(any());
    }
}
