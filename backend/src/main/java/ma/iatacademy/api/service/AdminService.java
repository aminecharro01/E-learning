package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.LessonProgress;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.AttemptStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.UserResponse;
import ma.iatacademy.api.dto.admin.AdminStatsResponse;
import ma.iatacademy.api.dto.admin.LearnerProgressDetailResponse;
import ma.iatacademy.api.dto.admin.LearnerSummaryResponse;
import ma.iatacademy.api.dto.admin.ResetPasswordResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.exception.ApiException;
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

    private static final UUID DEFAULT_FORMATIONATION_ID =
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

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

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        long learners = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ETUDIANT && u.isEnabled())
                .count();
        List<ma.iatacademy.api.domain.entity.QuizAttempt> attempts = quizAttemptRepository.findAll();
        double avg = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.PASSED || a.getStatus() == AttemptStatus.FAILED)
                .map(ma.iatacademy.api.domain.entity.QuizAttempt::getScore)
                .filter(s -> s != null)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0.0);
        return new AdminStatsResponse(
                learners,
                BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP).doubleValue(),
                certificateRepository.count(),
                moduleRepository.count(),
                lessonRepository.findAll().stream().filter(l -> l.isPublished()).count(),
                attempts.size()
        );
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(this::toUserResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsersPaged(int page, int size, String q) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        if (q != null && !q.isBlank()) {
            String needle = q.trim();
            List<User> all = userRepository.findAll().stream()
                    .filter(u -> matchesQuery(u, needle))
                    .sorted((a, b) -> a.getEmail().compareToIgnoreCase(b.getEmail()))
                    .toList();
            int from = Math.min(safePage * safeSize, all.size());
            int to = Math.min(from + safeSize, all.size());
            List<UserResponse> content = all.subList(from, to).stream().map(this::toUserResponse).toList();
            return PageResponse.of(content, safePage, safeSize, all.size());
        }
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("email"));
        return PageResponse.from(userRepository.findAll(pageable).map(this::toUserResponse));
    }

    @Transactional(readOnly = true)
    public PageResponse<LearnerSummaryResponse> listLearners(int page, int size, String q) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by("email"));
        Page<User> learners = (q != null && !q.isBlank())
                ? userRepository.searchByRoleAndQuery(Role.ETUDIANT, q.trim(), pageable)
                : userRepository.findByRole(Role.ETUDIANT, pageable);

        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(DEFAULT_FORMATIONATION_ID);
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
        Formation formation = formationRepository.findById(DEFAULT_FORMATIONATION_ID)
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
    public UserResponse updateRole(UUID userId, Role role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (role == Role.SUPPORT) {
            throw new ApiException("Le rôle SUPPORT n'est pas activé en MVP.");
        }
        user.setRole(role);
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
        return toUserResponse(user);
    }

    @Transactional
    public ResetPasswordResponse resetPassword(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        String temporary = appSettingsService.getDefaultResetPassword();
        user.setPasswordHash(passwordEncoder.encode(temporary));
        userRepository.save(user);
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
        return new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isEnabled());
    }

    private boolean matchesQuery(User u, String q) {
        String needle = q.toLowerCase();
        return u.getEmail().toLowerCase().contains(needle)
                || (u.getFullName() != null && u.getFullName().toLowerCase().contains(needle));
    }
}
