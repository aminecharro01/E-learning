package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.gradebook.LearnerBulletinResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.GradebookService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Self-scoped only - separate from the staff-only GradebookController (which is
 * gated hasAnyRole('ADMIN','FORMATEUR') at the class level) so this endpoint stays
 * open to any authenticated learner without touching that restriction. */
@RestController
@RequestMapping("/api/gradebook")
@RequiredArgsConstructor
public class LearnerGradebookController {

    private final GradebookService gradebookService;

    @GetMapping("/me")
    public ResponseEntity<LearnerBulletinResponse> myBulletin(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(gradebookService.buildForStudent(principal.getId()));
    }
}
