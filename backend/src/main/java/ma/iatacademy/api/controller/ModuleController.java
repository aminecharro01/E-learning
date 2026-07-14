package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.catalog.ModuleDetailResponse;
import ma.iatacademy.api.dto.catalog.ModuleSummaryResponse;
import ma.iatacademy.api.dto.catalog.UpdateModuleRequest;
import ma.iatacademy.api.dto.lesson.CreateLessonRequest;
import ma.iatacademy.api.dto.lesson.LessonDetailResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.CatalogService;
import ma.iatacademy.api.service.LessonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/modules")
@RequiredArgsConstructor
public class ModuleController {

    private final CatalogService catalogService;
    private final LessonService lessonService;

    @GetMapping("/{id}")
    public ResponseEntity<ModuleDetailResponse> getModule(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(catalogService.getModule(id, principal));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<ModuleSummaryResponse> updateModule(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateModuleRequest request
    ) {
        return ResponseEntity.ok(catalogService.updateModule(id, request));
    }

    @PostMapping("/{id}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<LessonDetailResponse> createLesson(
            @PathVariable UUID id,
            @Valid @RequestBody CreateLessonRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lessonService.createLesson(id, request));
    }
}
