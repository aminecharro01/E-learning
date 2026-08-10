package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.dto.lesson.*;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.exception.ForbiddenException;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.LessonBlockRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final ModuleRepository moduleRepository;
    private final LessonLockService lessonLockService;
    private final ProgressionService progressionService;

    @Transactional(readOnly = true)
    public LessonDetailResponse getLesson(UUID lessonId, UserPrincipal principal) {
        Lesson lesson = findLesson(lessonId);
        progressionService.assertModuleAccessible(principal, lesson.getModule());
        return toDetail(lesson);
    }

    @Transactional
    public LessonDetailResponse createLesson(UUID moduleId, CreateLessonRequest request) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        Lesson lesson = Lesson.builder()
                .module(module)
                .title(request.title().trim())
                .orderIndex(request.orderIndex())
                .published(Boolean.TRUE.equals(request.published()))
                .build();
        lessonRepository.save(lesson);
        return toDetail(lesson);
    }

    @Transactional
    public LessonDetailResponse updateLesson(UUID lessonId, UpdateLessonRequest request, UUID editorId) {
        Lesson lesson = findLesson(lessonId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        if (request.title() != null && !request.title().isBlank()) {
            lesson.setTitle(request.title().trim());
        }
        if (request.orderIndex() != null) {
            lesson.setOrderIndex(request.orderIndex());
        }
        if (request.published() != null) {
            lesson.setPublished(request.published());
        }
        return toDetail(lesson);
    }

    @Transactional
    public void deleteLesson(UUID lessonId, UUID editorId) {
        Lesson lesson = findLesson(lessonId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        lessonRepository.delete(lesson);
        lessonLockService.forceRelease(lessonId);
    }

    @Transactional(readOnly = true)
    public List<BlockResponse> listBlocks(UUID lessonId, UserPrincipal principal) {
        Lesson lesson = findLesson(lessonId);
        progressionService.assertModuleAccessible(principal, lesson.getModule());
        return lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)
                .stream()
                .map(this::toBlock)
                .toList();
    }

    @Transactional
    public BlockResponse createBlock(UUID lessonId, CreateBlockRequest request, UUID editorId) {
        Lesson lesson = findLesson(lessonId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        // Never trust the client-computed orderIndex (it's derived from local React state
        // and goes stale under quick successive adds, e.g. clicking "+ Texte" then
        // "+ Vidéo" before the first request resolves) — both would compute the same
        // "next" index and the second insert would violate the (lesson_id, order_index)
        // unique constraint. Always append after the current highest index instead.
        int nextIndex = lessonBlockRepository.findTopByLessonIdOrderByOrderIndexDesc(lessonId)
                .map(b -> b.getOrderIndex() + 1)
                .orElse(0);
        LessonBlock block = LessonBlock.builder()
                .lesson(lesson)
                .blockType(request.blockType())
                .content(request.content() != null ? request.content() : Map.of())
                .orderIndex(nextIndex)
                .build();
        lessonBlockRepository.save(block);
        return toBlock(block);
    }

    @Transactional
    public BlockResponse updateBlock(UUID lessonId, UUID blockId, UpdateBlockRequest request, UUID editorId) {
        LessonBlock block = findBlock(lessonId, blockId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        if (request.blockType() != null) {
            block.setBlockType(request.blockType());
        }
        if (request.content() != null) {
            block.setContent(request.content());
        }
        if (request.orderIndex() != null) {
            block.setOrderIndex(request.orderIndex());
        }
        return toBlock(block);
    }

    @Transactional
    public void deleteBlock(UUID lessonId, UUID blockId, UUID editorId) {
        LessonBlock block = findBlock(lessonId, blockId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        lessonBlockRepository.delete(block);
    }

    @Transactional
    public List<BlockResponse> reorderBlocks(UUID lessonId, List<ReorderBlockItem> items, UUID editorId) {
        findLesson(lessonId);
        lessonLockService.assertOwnedBy(lessonId, editorId);
        if (items == null || items.isEmpty()) {
            throw new ApiException("La liste de réordonnancement est vide.");
        }

        List<LessonBlock> blocks = lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId);
        Map<UUID, LessonBlock> byId = new HashMap<>();
        for (LessonBlock block : blocks) {
            byId.put(block.getId(), block);
        }
        if (items.size() != blocks.size()) {
            throw new ApiException("La liste de réordonnancement doit contenir tous les blocs.");
        }

        // Two-phase update to avoid unique constraint collisions on (lesson_id, order_index)
        int offset = 10_000;
        for (int i = 0; i < items.size(); i++) {
            ReorderBlockItem item = items.get(i);
            LessonBlock block = byId.get(item.id());
            if (block == null) {
                throw new NotFoundException("Bloc introuvable dans cette leçon: " + item.id());
            }
            block.setOrderIndex(offset + i);
        }
        lessonBlockRepository.flush();

        for (ReorderBlockItem item : items) {
            byId.get(item.id()).setOrderIndex(item.orderIndex());
        }
        lessonBlockRepository.flush();

        return lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)
                .stream()
                .map(this::toBlock)
                .toList();
    }

    private Lesson findLesson(UUID lessonId) {
        return lessonRepository.findById(lessonId)
                .orElseThrow(() -> new NotFoundException("Leçon introuvable."));
    }

    private LessonBlock findBlock(UUID lessonId, UUID blockId) {
        LessonBlock block = lessonBlockRepository.findById(blockId)
                .orElseThrow(() -> new NotFoundException("Bloc introuvable."));
        if (!block.getLesson().getId().equals(lessonId)) {
            throw new ForbiddenException("Ce bloc n'appartient pas à la leçon indiquée.");
        }
        return block;
    }

    private LessonDetailResponse toDetail(Lesson lesson) {
        List<BlockResponse> blocks = lessonBlockRepository
                .findByLessonIdOrderByOrderIndexAsc(lesson.getId())
                .stream()
                .map(this::toBlock)
                .toList();
        return new LessonDetailResponse(
                lesson.getId(),
                lesson.getModule().getId(),
                lesson.getTitle(),
                lesson.getOrderIndex(),
                lesson.isPublished(),
                blocks
        );
    }

    private BlockResponse toBlock(LessonBlock block) {
        return new BlockResponse(
                block.getId(),
                block.getBlockType(),
                block.getContent(),
                block.getOrderIndex()
        );
    }
}
