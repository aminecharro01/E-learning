package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonComment;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.BadgeCode;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.comment.CreateCommentRequest;
import ma.iatacademy.api.dto.comment.LessonCommentResponse;
import ma.iatacademy.api.dto.common.PageResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonCommentRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final LessonCommentRepository commentRepository;
    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final ProgressionService progressionService;
    private final BadgeService badgeService;

    @Transactional(readOnly = true)
    public List<LessonCommentResponse> listByLesson(UUID lessonId, UserPrincipal principal) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
        assertLessonAccess(principal, lesson);
        return threaded(commentRepository.findByLessonIdOrderByCreatedAtAsc(lessonId), principal);
    }

    @Transactional(readOnly = true)
    public List<LessonCommentResponse> listByModule(UUID moduleId, UserPrincipal principal) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        assertModuleAccess(principal, module);
        return threaded(commentRepository.findByModuleIdOrderByCreatedAtAsc(moduleId), principal);
    }

    @Transactional
    public LessonCommentResponse createOnLesson(UUID lessonId, CreateCommentRequest request, UserPrincipal principal) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
        assertLessonAccess(principal, lesson);
        LessonComment parent = resolveParent(request.parentId());
        LessonComment comment = LessonComment.builder()
                .lesson(lesson)
                .parent(parent)
                .author(userRepository.getReferenceById(principal.getId()))
                .body(request.body().trim())
                .build();
        LessonComment saved = commentRepository.save(comment);
        awardForumBadge(principal);
        return toResponse(saved, principal);
    }

    @Transactional
    public LessonCommentResponse createOnModule(UUID moduleId, CreateCommentRequest request, UserPrincipal principal) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        assertModuleAccess(principal, module);
        LessonComment parent = resolveParent(request.parentId());
        LessonComment comment = LessonComment.builder()
                .module(module)
                .parent(parent)
                .author(userRepository.getReferenceById(principal.getId()))
                .body(request.body().trim())
                .build();
        LessonComment saved = commentRepository.save(comment);
        awardForumBadge(principal);
        return toResponse(saved, principal);
    }

    private void awardForumBadge(UserPrincipal principal) {
        if (principal.getRole() == Role.ETUDIANT) {
            badgeService.awardIfAbsent(userRepository.getReferenceById(principal.getId()), BadgeCode.FORUM_CONTRIBUTOR);
        }
    }

    @Transactional
    public void hide(UUID commentId) {
        setHidden(commentId, true);
    }

    @Transactional
    public void unhide(UUID commentId) {
        setHidden(commentId, false);
    }

    @Transactional
    public void pin(UUID commentId, boolean pinned) {
        LessonComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Commentaire introuvable."));
        comment.setPinned(pinned);
        commentRepository.save(comment);
    }

    /** File de modération admin — les commentaires masqués, tous fils/modules confondus. */
    @Transactional(readOnly = true)
    public PageResponse<LessonCommentResponse> moderationQueue(int page, int size) {
        var result = commentRepository.findByHiddenTrueOrderByCreatedAtDesc(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(result.map(c -> toResponse(c, null)));
    }

    private void setHidden(UUID commentId, boolean hidden) {
        LessonComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new NotFoundException("Commentaire introuvable."));
        comment.setHidden(hidden);
        commentRepository.save(comment);
    }

    private LessonComment resolveParent(UUID parentId) {
        if (parentId == null) {
            return null;
        }
        LessonComment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new NotFoundException("Commentaire parent introuvable."));
        if (parent.getParent() != null) {
            // Un seul niveau de réponse : une réponse à une réponse s'accroche au fil racine.
            throw new ApiException("Impossible de répondre à une réponse — répondez au message d'origine.");
        }
        return parent;
    }

    private void assertLessonAccess(UserPrincipal principal, Lesson lesson) {
        if (principal.getRole() == Role.ETUDIANT) {
            progressionService.assertModuleAccessible(principal, lesson.getModule());
        }
    }

    private void assertModuleAccess(UserPrincipal principal, ModuleEntity module) {
        if (principal.getRole() == Role.ETUDIANT) {
            progressionService.assertModuleAccessible(principal, module);
        }
    }

    /** Regroupe les commentaires racine + réponses (1 niveau), racines épinglées en tête. */
    private List<LessonCommentResponse> threaded(List<LessonComment> all, UserPrincipal principal) {
        boolean staff = principal != null && principal.getRole().isStaff();
        Map<UUID, List<LessonComment>> repliesByParent = new LinkedHashMap<>();
        List<LessonComment> roots = all.stream()
                .filter(c -> staff || !c.isHidden())
                .filter(c -> c.getParent() == null)
                .sorted(Comparator.comparing((LessonComment c) -> !c.isPinned())
                        .thenComparing(LessonComment::getCreatedAt))
                .toList();
        for (LessonComment c : all) {
            if (c.getParent() != null && (staff || !c.isHidden())) {
                repliesByParent.computeIfAbsent(c.getParent().getId(), k -> new java.util.ArrayList<>()).add(c);
            }
        }
        return roots.stream()
                .map(root -> toResponse(root, repliesByParent.getOrDefault(root.getId(), List.of()), principal))
                .toList();
    }

    private LessonCommentResponse toResponse(LessonComment c, UserPrincipal principal) {
        return toResponse(c, List.of(), principal);
    }

    private LessonCommentResponse toResponse(LessonComment c, List<LessonComment> replies, UserPrincipal principal) {
        User author = c.getAuthor();
        return new LessonCommentResponse(
                c.getId(),
                c.getLesson() != null ? c.getLesson().getId() : null,
                c.getModule() != null ? c.getModule().getId() : null,
                c.getParent() != null ? c.getParent().getId() : null,
                author.getId(),
                author.getFullName() != null ? author.getFullName() : author.getEmail(),
                author.getRole().isStaff(),
                c.getBody(),
                c.isHidden(),
                c.isPinned(),
                c.getCreatedAt(),
                replies.stream()
                        .sorted(Comparator.comparing(LessonComment::getCreatedAt))
                        .map(r -> toResponse(r, principal))
                        .toList()
        );
    }
}
