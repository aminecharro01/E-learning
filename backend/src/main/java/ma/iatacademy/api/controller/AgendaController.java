package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.agenda.AgendaItemResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.AgendaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/agenda")
@RequiredArgsConstructor
public class AgendaController {

    private final AgendaService agendaService;

    @GetMapping
    public ResponseEntity<List<AgendaItemResponse>> myAgenda(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(agendaService.myAgenda(principal.getId()));
    }
}
