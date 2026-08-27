package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import static ma.iatacademy.api.config.FormationDefaults.DEFAULT_FORMATION_ID;
import ma.iatacademy.api.domain.entity.Certificate;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.dto.admin.AdminStatsResponse;
import ma.iatacademy.api.dto.admin.DiplomaReadyResponse;
import ma.iatacademy.api.dto.admin.LearnerProgressDetailResponse;
import ma.iatacademy.api.dto.admin.LearnerSummaryResponse;
import ma.iatacademy.api.dto.admin.ResetPasswordResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {


    private final UserRepository userRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CertificateRepository certificateRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final FormationRepository formationRepository;
    private final ProgressionService progressionService;
    private final AppSettingsService appSettingsService;
    private final PasswordEncoder passwordEncoder;
    private final ContactMessageRepository contactMessageRepository;
    private final NewsletterSubscriberRepository newsletterSubscriberRepository;
    private final AuditLogService auditLogService;

    private static final List<AttemptStatus> SCORED_STATUSES = List.of(AttemptStatus.PASSED, AttemptStatus.FAILED);

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        long learners = userRepository.countByRoleAndEnabledTrue(Role.ETUDIANT);
        Double avgOrNull = quizAttemptRepository.averageScoreByStatusIn(SCORED_STATUSES);
        double avg = avgOrNull != null ? avgOrNull : 0.0;
        return new AdminStatsResponse(
                learners,
                BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue(),
                certificateRepository.count(),
                moduleRepository.count(),
                lessonRepository.countByPublishedTrue(),
                quizAttemptRepository.count(),
                contactMessageRepository.countByStatus("NEW"),
                newsletterSubscriberRepository.countByActiveTrue()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsersPaged(int page, int size, String q, Role role) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("email"));
        boolean hasQuery = q != null && !q.isBlank();
        Page<User> result;
        if (role != null && hasQuery) {
            result = userRepository.searchByRoleAndQuery(role, q.trim(), pageable);
        } else if (role != null) {
            result = userRepository.findByRole(role, pageable);
        } else if (hasQuery) {
            result = userRepository.searchByQuery(q.trim(), pageable);
        } else {
            result = userRepository.findAll(pageable);
        }
        return PageResponse.from(result.map(this::toUserResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<LearnerSummaryResponse> listLearners(int page, int size, String q) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by("email"));
        Page<User> learners = (q != null && !q.isBlank())
                ? userRepository.searchByRoleAndQuery(Role.ETUDIANT, q.trim(), pageable)
                : userRepository.findByRole(Role.ETUDIANT, pageable);

        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(DEFAULT_FORMATION_ID);
        int totalModules = modules.size();

        List<LearnerSummaryResponse> content = learners.getContent().stream()
                .map(u -> toLearnerSummary(u, modules, totalModules))
                .toList();

        return new PageResponse<>(
                content,
                learners.getNumber(),
                learners.getSize(),
                learners.getTotalElements(),
                learners.getTotalPages(),
                learners.isFirst(),
                learners.isLast()
        );
    }

    @Transactional(readOnly = true)
    public LearnerProgressDetailResponse getLearnerProgress(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole() != Role.ETUDIANT) {
            throw new ApiException("Ce compte n'est pas un apprenant.");
        }
        Formation formation = formationRepository.findById(DEFAULT_FORMATION_ID)
                .orElseThrow(() -> new NotFoundException("Formation introuvable."));
        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(formation.getId());
        List<LearnerProgressDetailResponse.ModuleStatusItem> items = modules.stream()
                .map(m -> {
                    var lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(m.getId())
                            .stream()
                            .map(lesson -> new LearnerProgressDetailResponse.LessonStatusItem(
                                    lesson.getId(),
                                    lesson.getTitle(),
                                    lesson.getOrderIndex(),
                                    lesson.isPublished(),
                                    progressionService.isLessonCompleted(userId, lesson.getId())
                            ))
                            .toList();
                    return new LearnerProgressDetailResponse.ModuleStatusItem(
                            m.getId(),
                            m.getTitle(),
                            m.getOrderIndex(),
                            progressionService.resolveModuleStatus(userId, m),
                            lessons
                    );
                })
                .toList();
        long completed = items.stream()
                .filter(i -> i.status() == ma.iatacademy.api.domain.enums.ModuleLearnerStatus.COMPLETED)
                .count();
        double percent = modules.isEmpty() ? 0
                : BigDecimal.valueOf(completed * 100.0 / modules.size())
                .setScale(1, RoundingMode.HALF_UP).doubleValue();
        return new LearnerProgressDetailResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                formation.getTitle(),
                percent,
                items
        );
    }

    @Transactional
    public UserResponse updateRole(UUID userId, Role role, UUID actorId, Role actorRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (role == Role.SUPPORT) {
            throw new ApiException("Le rôle SUPPORT n'est pas activé en MVP.");
        }
        boolean touchesAdminTier = role == Role.ADMIN || role == Role.SUPER_ADMIN
                || user.getRole() == Role.ADMIN || user.getRole() == Role.SUPER_ADMIN;
        if (touchesAdminTier && actorRole != Role.SUPER_ADMIN) {
            throw new ForbiddenException(
                    "Seul le Super Admin peut modifier le rôle d'un Directeur ou d'un Super Admin.");
        }
        user.setRole(role);
        auditLogService.record(actorId, "USER_ROLE_CHANGED", "User", userId, "role=" + role);
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse setEnabled(UUID userId, boolean enabled, UUID actorId) {
        if (userId.equals(actorId) && !enabled) {
            throw new ApiException("Vous ne pouvez pas suspendre votre propre compte.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        user.setEnabled(enabled);
        if (enabled && user.getActivatedAt() == null) {
            user.setActivatedAt(java.time.Instant.now());
            if (user.getPaymentStatus() == ma.iatacademy.api.domain.enums.PaymentStatus.PENDING) {
                user.setPaymentStatus(ma.iatacademy.api.domain.enums.PaymentStatus.PAID);
            }
        }
        auditLogService.record(actorId, enabled ? "USER_ENABLED" : "USER_DISABLED", "User", userId, null);
        return toUserResponse(user);
    }

    /** Bulk variant of setEnabled — same rules, applied to every id, skipping the actor's own account. */
    @Transactional
    public MessageResponse bulkSetEnabled(List<UUID> userIds, boolean enabled, UUID actorId) {
        int updated = 0;
        for (UUID userId : userIds) {
            if (userId.equals(actorId) && !enabled) {
                continue;
            }
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                continue;
            }
            user.setEnabled(enabled);
            if (enabled && user.getActivatedAt() == null) {
                user.setActivatedAt(java.time.Instant.now());
                if (user.getPaymentStatus() == ma.iatacademy.api.domain.enums.PaymentStatus.PENDING) {
                    user.setPaymentStatus(ma.iatacademy.api.domain.enums.PaymentStatus.PAID);
                }
            }
            updated++;
        }
        auditLogService.record(actorId, enabled ? "USER_BULK_ENABLED" : "USER_BULK_DISABLED", "User", null,
                updated + " compte(s)");
        return new MessageResponse(updated + " compte(s) mis à jour.");
    }

    @Transactional
    public UserResponse setYear2Access(UUID userId, boolean year2AccessEnabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole() != Role.ETUDIANT) {
            throw new ApiException("L'accès année 2 ne s'applique qu'aux apprenants.");
        }
        user.setYear2AccessEnabled(year2AccessEnabled);
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse updateUserProfile(UUID userId, ma.iatacademy.api.dto.UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null) {
            String phone = request.phone().trim();
            user.setPhone(phone.isEmpty() ? null : phone);
        }
        if (request.cin() != null) {
            String cin = request.cin().trim();
            user.setCin(cin.isEmpty() ? null : cin);
        }
        if (request.birthDate() != null) {
            user.setBirthDate(request.birthDate());
        }
        if (request.address() != null) {
            String address = request.address().trim();
            user.setAddress(address.isEmpty() ? null : address);
        }
        return toUserResponse(user);
    }

    @Transactional
    public MessageResponse openYear2ForAllEnabledLearners() {
        List<User> learners = userRepository.findByRoleAndEnabledTrue(Role.ETUDIANT);
        for (User learner : learners) {
            learner.setYear2AccessEnabled(true);
        }
        return new MessageResponse(learners.size() + " apprenant(s) actif(s) : année 2 ouverte.");
    }

    @Transactional(readOnly = true)
    public List<DiplomaReadyResponse> listDiplomas() {
        return certificateRepository.findAll(Sort.by(Sort.Direction.DESC, "issuedAt")).stream()
                .map(c -> new DiplomaReadyResponse(
                        c.getId(),
                        c.getUser().getId(),
                        c.getUser().getFullName() != null ? c.getUser().getFullName() : c.getUser().getEmail(),
                        c.getUser().getEmail(),
                        c.getVerificationCode(),
                        c.getIssuedAt(),
                        c.isPhysicallyDelivered(),
                        c.getDeliveredAt(),
                        c.getDeliveredNote()
                ))
                .toList();
    }

    @Transactional
    public DiplomaReadyResponse markDiplomaDelivered(UUID certificateId, boolean delivered, String note) {
        Certificate cert = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new NotFoundException("Diplôme introuvable."));
        cert.setPhysicallyDelivered(delivered);
        cert.setDeliveredAt(delivered ? java.time.Instant.now() : null);
        cert.setDeliveredNote(note != null && !note.isBlank() ? note.trim() : null);
        return new DiplomaReadyResponse(
                cert.getId(),
                cert.getUser().getId(),
                cert.getUser().getFullName() != null ? cert.getUser().getFullName() : cert.getUser().getEmail(),
                cert.getUser().getEmail(),
                cert.getVerificationCode(),
                cert.getIssuedAt(),
                cert.isPhysicallyDelivered(),
                cert.getDeliveredAt(),
                cert.getDeliveredNote()
        );
    }

    @Transactional
    public ResetPasswordResponse resetPassword(UUID userId, UUID actorId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        String temporary = appSettingsService.getDefaultResetPassword();
        user.setPasswordHash(passwordEncoder.encode(temporary));
        userRepository.save(user);
        auditLogService.record(actorId, "USER_PASSWORD_RESET", "User", userId, null);
        return new ResetPasswordResponse(
                "Mot de passe réinitialisé pour " + user.getEmail() + ".",
                temporary
        );
    }

    @Transactional
    public MessageResponse unlockModule(UUID userId, UUID moduleId) {
        if (!userRepository.existsById(userId)) {
            throw new NotFoundException("Utilisateur introuvable.");
        }
        var lessons = lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId);
        if (lessons.isEmpty()) {
            throw new NotFoundException("Module sans leçons.");
        }
        for (var lesson : lessons) {
            LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(userId, lesson.getId())
                    .orElseGet(() -> LessonProgress.builder()
                            .user(userRepository.getReferenceById(userId))
                            .lesson(lesson)
                            .build());
            progress.setVideoWatchedPercent(100);
            progress.setCompleted(true);
            progress.setCompletedAt(java.time.Instant.now());
            lessonProgressRepository.save(progress);
        }
        return new MessageResponse("Module débloqué manuellement pour l'apprenant (leçons marquées terminées).");
    }

    private LearnerSummaryResponse toLearnerSummary(User u, List<ModuleEntity> modules, int totalModules) {
        int completed = (int) modules.stream()
                .filter(m -> progressionService.isModuleCompleted(u.getId(), m.getId()))
                .count();
        double percent = totalModules == 0 ? 0
                : BigDecimal.valueOf(completed * 100.0 / totalModules)
                .setScale(1, RoundingMode.HALF_UP).doubleValue();
        return new LearnerSummaryResponse(
                u.getId(),
                u.getEmail(),
                u.getFullName(),
                u.isEnabled(),
                percent,
                completed,
                totalModules
        );
    }

    private UserResponse toUserResponse(User u) {
        return AuthService.toResponse(u);
    }
}
