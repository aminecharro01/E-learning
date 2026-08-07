package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.analytics.HeartbeatRequest;
import ma.iatacademy.api.dto.analytics.InactiveStudentResponse;
import ma.iatacademy.api.dto.analytics.ModuleTimeResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.EarlyWarningService;
import ma.iatacademy.api.service.TimeTrackingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    private final TimeTrackingService timeTrackingService;
    private final EarlyWarningService earlyWarningService;

    @PostMapping("/api/lessons/{lessonId}/heartbeat")
    public ResponseEntity<MessageResponse> heartbeat(
            @PathVariable UUID lessonId,
            @Valid @RequestBody HeartbeatRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        timeTrackingService.recordHeartbeat(principal.getId(), lessonId, request.deltaSeconds());
        return ResponseEntity.ok(new MessageResponse("OK"));
    }

    @GetMapping("/api/admin/analytics/inactive-students")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<InactiveStudentResponse>> inactiveStudents(
            @RequestParam(defaultValue = "7") int days
    ) {
        return ResponseEntity.ok(earlyWarningService.findInactiveStudents(days));
    }

    @GetMapping("/api/admin/analytics/modules/{moduleId}/time")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<List<ModuleTimeResponse>> moduleTime(@PathVariable UUID moduleId) {
        return ResponseEntity.ok(earlyWarningService.moduleTimeBreakdown(moduleId));
    }
}
