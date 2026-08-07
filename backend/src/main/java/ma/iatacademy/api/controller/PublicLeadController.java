package ma.iatacademy.api.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.dto.MessageResponse;
import ma.iatacademy.api.dto.publicapi.ContactRequest;
import ma.iatacademy.api.dto.publicapi.NewsletterSubscribeRequest;
import ma.iatacademy.api.service.PublicLeadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicLeadController {

    private final PublicLeadService publicLeadService;

    @PostMapping("/contact")
    public ResponseEntity<MessageResponse> contact(@Valid @RequestBody ContactRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(publicLeadService.submitContact(request));
    }

    @PostMapping("/newsletter")
    public ResponseEntity<MessageResponse> newsletter(@Valid @RequestBody NewsletterSubscribeRequest request) {
        return ResponseEntity.ok(publicLeadService.subscribeNewsletter(request));
    }
}
