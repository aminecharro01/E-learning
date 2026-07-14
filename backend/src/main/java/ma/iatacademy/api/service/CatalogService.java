package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;
import ma.iatacademy.api.dto.catalog.FormationResponse;
import ma.iatacademy.api.dto.catalog.LessonSummaryResponse;
import ma.iatacademy.api.dto.catalog.ModuleDetailResponse;
import ma.iatacademy.api.dto.catalog.ModuleSummaryResponse;
import ma.iatacademy.api.dto.catalog.UpdateModuleRequest;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final FormationRepository formationRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final ProgressionService progressionService;

    @Transactional(readOnly = true)
    public FormationResponse getFormation(UUID formationId, UserPrincipal principal) {
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new NotFoundException("Formation introuvable."));
        List<ModuleSummaryResponse> modules = moduleRepository
                .findByFormationIdOrderByOrderIndexAsc(formationId)
                .stream()
                .map(module -> toModuleSummary(module, principal))
                .toList();
        return new FormationResponse(
                formation.getId(),
                formation.getTitle(),
                formation.getDescription(),
                formation.isPublished(),
                modules
        );
    }

    @Transactional(readOnly = true)
    public ModuleDetailResponse getModule(UUID moduleId, UserPrincipal principal) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        progressionService.assertModuleAccessible(principal, module);

        ModuleLearnerStatus status = progressionService.resolveModuleStatus(principal.getId(), module);
        List<LessonSummaryResponse> lessons = lessonRepository
                .findByModuleIdOrderByOrderIndexAsc(moduleId)
                .stream()
                .map(lesson -> new LessonSummaryResponse(
                        lesson.getId(),
                        lesson.getTitle(),
                        lesson.getOrderIndex(),
                        lesson.isPublished(),
                        progressionService.isLessonCompleted(principal.getId(), lesson.getId())
                ))
                .toList();

        return new ModuleDetailResponse(
                module.getId(),
                module.getFormation().getId(),
                module.getTitle(),
                module.getDescription(),
                module.getOrderIndex(),
                module.isPublished(),
                status,
                lessons
        );
    }

    @Transactional
    public ModuleSummaryResponse updateModule(UUID moduleId, UpdateModuleRequest request) {
        ModuleEntity module = moduleRepository.findById(moduleId)
                .orElseThrow(() -> new NotFoundException("Module introuvable."));
        module.setTitle(request.title().trim());
        module.setDescription(request.description() != null ? request.description().trim() : null);
        module.setOrderIndex(request.orderIndex());
        if (request.published() != null) {
            module.setPublished(request.published());
        }
        return new ModuleSummaryResponse(
                module.getId(),
                module.getTitle(),
                module.getDescription(),
                module.getOrderIndex(),
                module.isPublished(),
                ModuleLearnerStatus.AVAILABLE
        );
    }

    private ModuleSummaryResponse toModuleSummary(ModuleEntity module, UserPrincipal principal) {
        ModuleLearnerStatus status = progressionService.resolveModuleStatus(principal.getId(), module);
        return new ModuleSummaryResponse(
                module.getId(),
                module.getTitle(),
                module.getDescription(),
                module.getOrderIndex(),
                module.isPublished(),
                status
        );
    }
}
