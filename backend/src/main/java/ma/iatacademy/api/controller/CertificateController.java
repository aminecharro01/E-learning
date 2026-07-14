package ma.iatacademy.api.controller;

import lombok.RequiredArgsConstructor;
import ma.iatacademy.api.domain.entity.Certificate;
import ma.iatacademy.api.dto.certificate.CertificateResponse;
import ma.iatacademy.api.security.UserPrincipal;
import ma.iatacademy.api.service.CertificateService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping("/me")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<CertificateResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        Certificate cert = certificateService.getMine(principal.getId());
        return ResponseEntity.ok(toResponse(cert));
    }

    @GetMapping("/me/download")
    @PreAuthorize("hasRole('ETUDIANT')")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal UserPrincipal principal) {
        Certificate cert = certificateService.getMine(principal.getId());
        Resource resource = new FileSystemResource(cert.getPdfPath());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attestation-iat.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    @GetMapping("/verify/{code}")
    public ResponseEntity<CertificateResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(toResponse(certificateService.verify(code)));
    }

    private CertificateResponse toResponse(Certificate cert) {
        return new CertificateResponse(
                cert.getId(),
                cert.getVerificationCode(),
                cert.getIssuedAt(),
                cert.getFormation().getTitle(),
                cert.getUser().getFullName() != null ? cert.getUser().getFullName() : cert.getUser().getEmail()
        );
    }
}
