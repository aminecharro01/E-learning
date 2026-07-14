package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.catalog.FormationResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.CatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/formations")
@RequiredArgsConstructor
public class FormationController {

    private final CatalogService catalogService;

    @GetMapping("/{id}")
    public ResponseEntity<FormationResponse> getFormation(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(catalogService.getFormation(id, principal));
    }
}
