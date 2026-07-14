package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.enums.ModuleLearnerStatus;
import ma.iatacademy.api.dto.catalog.ModuleSummaryResponse;
import ma.iatacademy.api.dto.catalog.ProgressResponse;
import ma.iatacademy.api.dto.progress.LessonProgressResponse;
import ma.iatacademy.api.dto.progress.UpdateLessonProgressRequest;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.ProgressionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    /** Seeded formation id from V1 migration. */
    private static final UUID DEFAULT_FORMATION_ID =
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private final FormationRepository formationRepository;
    private final ModuleRepository moduleRepository;
    private final ProgressionService progressionService;

    @GetMapping("/me")
    public ResponseEntity<ProgressResponse> myProgress(@AuthenticationPrincipal UserPrincipal principal) {
        Formation formation = formationRepository.findById(DEFAULT_FORMATION_ID)
                .orElseThrow(() -> new NotFoundException("Formation IAT Academy introuvable."));

        List<ModuleEntity> modules = moduleRepository
                .findByFormationIdOrderByOrderIndexAsc(formation.getId());

        List<ModuleSummaryResponse> summaries = modules.stream()
                .map(module -> new ModuleSummaryResponse(
                        module.getId(),
                        module.getTitle(),
                        module.getDescription(),
                        module.getOrderIndex(),
                        module.isPublished(),
                        progressionService.resolveModuleStatus(principal.getId(), module)
                ))
                .toList();

        long completed = summaries.stream()
                .filter(m -> m.learnerStatus() == ModuleLearnerStatus.COMPLETED)
                .count();
        double percent = modules.isEmpty() ? 0.0 : (completed * 100.0) / modules.size();

        UUID currentModuleId = summaries.stream()
                .filter(m -> m.learnerStatus() == ModuleLearnerStatus.IN_PROGRESS
                        || m.learnerStatus() == ModuleLearnerStatus.AVAILABLE)
                .map(ModuleSummaryResponse::id)
                .findFirst()
                .orElse(null);

        return ResponseEntity.ok(new ProgressResponse(
                formation.getId(),
                formation.getTitle(),
                Math.round(percent * 100.0) / 100.0,
                currentModuleId,
                summaries
        ));
    }

    @PostMapping("/lessons/{lessonId}")
    public ResponseEntity<LessonProgressResponse> updateLessonProgress(
            @PathVariable UUID lessonId,
            @Valid @RequestBody UpdateLessonProgressRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(
                progressionService.updateLessonProgress(
                        principal.getId(), lessonId, request.videoWatchedPercent()));
    }
}
