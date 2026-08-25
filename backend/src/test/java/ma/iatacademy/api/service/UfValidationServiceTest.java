package ma.iatacademy.api.service;

import ma.iatacademy.api.domain.entity.LearnerUfValidation;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.stage.UfValidationResponse;
import ma.iatacademy.api.dto.stage.ValidateUfRequest;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.repository.LearnerUfValidationRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UfValidationServiceTest {

    @Mock
    private LearnerUfValidationRepository validationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BadgeService badgeService;

    @InjectMocks
    private UfValidationService ufValidationService;

    @Test
    void nonGatedUfIsAlwaysConsideredValidated() {
        assertTrue(ufValidationService.isValidated(UUID.randomUUID(), "UF 1"));
    }

    @Test
    void gatedUfDefaultsToNotValidated() {
        UUID learnerId = UUID.randomUUID();
        when(validationRepository.findByLearnerIdAndUfCode(learnerId, "UF 5")).thenReturn(Optional.empty());

        assertFalse(ufValidationService.isValidated(learnerId, "UF 5"));
    }

    @Test
    void validateRejectsNonStaffPrincipal() {
        User learner = User.builder().id(UUID.randomUUID()).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(learner);
        ValidateUfRequest request = new ValidateUfRequest("UF 5", true, null);

        assertThrows(ForbiddenException.class,
                () -> ufValidationService.validate(UUID.randomUUID(), request, principal));
    }

    @Test
    void validateRejectsNonGatedUf() {
        User director = User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build();
        UserPrincipal principal = new UserPrincipal(director);
        ValidateUfRequest request = new ValidateUfRequest("UF 1", true, null);

        assertThrows(ApiException.class,
                () -> ufValidationService.validate(UUID.randomUUID(), request, principal));
    }

    @Test
    void validateRejectsNonLearnerTarget() {
        UUID learnerId = UUID.randomUUID();
        User director = User.builder().id(UUID.randomUUID()).role(Role.ADMIN).build();
        UserPrincipal principal = new UserPrincipal(director);
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(
                User.builder().id(learnerId).role(Role.FORMATEUR).build()));

        assertThrows(ApiException.class,
                () -> ufValidationService.validate(learnerId, new ValidateUfRequest("UF 5", true, null), principal));
    }

    @Test
    void validateNotifiesAndAwardsBadgeOnFirstValidation() {
        UUID learnerId = UUID.randomUUID();
        UUID directorId = UUID.randomUUID();
        User learner = User.builder().id(learnerId).role(Role.ETUDIANT).build();
        User director = User.builder().id(directorId).role(Role.ADMIN).build();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(userRepository.findById(directorId)).thenReturn(Optional.of(director));
        when(validationRepository.findByLearnerIdAndUfCode(learnerId, "UF 5")).thenReturn(Optional.empty());
        when(validationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserPrincipal principal = new UserPrincipal(director);
        UfValidationResponse response = ufValidationService.validate(
                learnerId, new ValidateUfRequest("UF 5", true, "OK"), principal);

        assertTrue(response.validated());
        verify(notificationService, times(1)).notify(any(), any(), any(), any(), any());
        verify(badgeService, times(1)).awardIfAbsent(learner, BadgeCode.STAGE_VALIDATED);
    }

    @Test
    void validateDoesNotReNotifyWhenAlreadyValidated() {
        UUID learnerId = UUID.randomUUID();
        UUID directorId = UUID.randomUUID();
        User learner = User.builder().id(learnerId).role(Role.ETUDIANT).build();
        User director = User.builder().id(directorId).role(Role.ADMIN).build();
        when(userRepository.findById(learnerId)).thenReturn(Optional.of(learner));
        when(userRepository.findById(directorId)).thenReturn(Optional.of(director));
        LearnerUfValidation existing = LearnerUfValidation.builder().learner(learner).ufCode("UF 5").validated(true).build();
        when(validationRepository.findByLearnerIdAndUfCode(learnerId, "UF 5")).thenReturn(Optional.of(existing));
        when(validationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserPrincipal principal = new UserPrincipal(director);
        ufValidationService.validate(learnerId, new ValidateUfRequest("UF 5", true, null), principal);

        verify(notificationService, never()).notify(any(), any(), any(), any(), any());
        verify(badgeService, never()).awardIfAbsent(any(), any());
    }
}
