package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.assistant.AssistantAskRequest;
import ma.iatacademy.api.dto.assistant.AssistantAskResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.CourseAssistantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class CourseAssistantController {

    private final CourseAssistantService courseAssistantService;

    @PostMapping("/ask")
    public ResponseEntity<AssistantAskResponse> ask(
            @Valid @RequestBody AssistantAskRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(courseAssistantService.ask(request.question(), principal.getId()));
    }
}
