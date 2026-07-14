package ma.iatacademy.api.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.Certificate;
import ma.iatacademy.api.domain.entity.Formation;
import ma.iatacademy.api.domain.entity.ModuleEntity;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.exception.NotFoundException;
import ma.iatacademy.api.repository.CertificateRepository;
import ma.iatacademy.api.repository.FormationRepository;
import ma.iatacademy.api.repository.ModuleRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final FormationRepository formationRepository;
    private final ModuleRepository moduleRepository;
    private final UserRepository userRepository;
    private final ProgressionService progressionService;

    @Value("${app.media.root-path:../data/media}")
    private String mediaRoot;

    @Transactional
    public void tryIssueIfEligible(UUID userId, UUID formationId) {
        if (certificateRepository.findByUserIdAndFormationId(userId, formationId).isPresent()) {
            return;
        }
        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(formationId);
        boolean allDone = !modules.isEmpty() && modules.stream()
                .allMatch(m -> progressionService.isModuleCompleted(userId, m.getId()));
        if (!allDone) {
            return;
        }
        issue(userId, formationId);
    }

    @Transactional
    public Certificate issue(UUID userId, UUID formationId) {
        return certificateRepository.findByUserIdAndFormationId(userId, formationId)
                .orElseGet(() -> createCertificate(userId, formationId));
    }

    @Transactional(readOnly = true)
    public Certificate getMine(UUID userId) {
        // Default seeded formation
        UUID formationId = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        return certificateRepository.findByUserIdAndFormationId(userId, formationId)
                .orElseThrow(() -> new NotFoundException(
                        "Aucune attestation disponible. Validez les 20 modules d'abord."));
    }

    @Transactional(readOnly = true)
    public Certificate verify(String code) {
        return certificateRepository.findByVerificationCode(code)
                .orElseThrow(() -> new NotFoundException("Code de vérification invalide."));
    }

    private Certificate createCertificate(UUID userId, UUID formationId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new NotFoundException("Formation introuvable."));

        String code = UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
        Path pdfPath = Path.of(mediaRoot, "certificates", userId + "-" + code + ".pdf");
        try {
            Files.createDirectories(pdfPath.getParent());
            generatePdf(pdfPath, user, formation, code);
        } catch (IOException e) {
            log.error("Failed to generate certificate PDF", e);
            throw new IllegalStateException("Impossible de générer l'attestation PDF.");
        }

        Certificate certificate = Certificate.builder()
                .user(user)
                .formation(formation)
                .verificationCode(code)
                .issuedAt(Instant.now())
                .pdfPath(pdfPath.toString())
                .build();
        return certificateRepository.save(certificate);
    }

    private void generatePdf(Path path, User user, Formation formation, String code) throws IOException {
        Document document = new Document();
        PdfWriter.getInstance(document, Files.newOutputStream(path));
        document.open();
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
        Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
        document.add(new Paragraph("IAT Academy", titleFont));
        document.add(new Paragraph(" "));
        document.add(new Paragraph("Attestation de réussite", titleFont));
        document.add(new Paragraph(" "));
        document.add(new Paragraph(
                "Certifie que " + (user.getFullName() != null ? user.getFullName() : user.getEmail())
                        + " a validé le parcours : " + formation.getTitle(),
                bodyFont));
        document.add(new Paragraph("Code de vérification : " + code, bodyFont));
        document.add(new Paragraph("Date : " + Instant.now(), bodyFont));
        document.close();
    }
}
