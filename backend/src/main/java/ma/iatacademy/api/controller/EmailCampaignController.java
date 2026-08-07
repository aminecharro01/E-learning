package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.campaign.CampaignResponse;
import ma.iatacademy.api.dto.campaign.CreateCampaignRequest;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.EmailCampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/campaigns")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class EmailCampaignController {

    private final EmailCampaignService campaignService;

    @GetMapping
    public ResponseEntity<List<CampaignResponse>> list() {
        return ResponseEntity.ok(campaignService.list());
    }

    @PostMapping
    public ResponseEntity<CampaignResponse> create(
            @Valid @RequestBody CreateCampaignRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request, principal.getId()));
    }

    @PostMapping("/{campaignId}/send")
    public ResponseEntity<MessageResponse> send(@PathVariable UUID campaignId) {
        campaignService.send(campaignId);
        return ResponseEntity.ok(new MessageResponse("Envoi de la campagne lancé."));
    }
}
