package ma.iatacademy.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.LearnerGroup;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.PaymentStatus;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.group.GroupImportResponse;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.LearnerGroupRepository;
import ma.iatacademy.api.repository.UserRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Instant;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Import Excel d'une promo présentielle : crée le groupe et un compte par ligne.
 * Colonnes attendues (avec ligne d'en-tête) : Nom complet | CIN/Matricule | Téléphone.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GroupImportService {

    /** Domaine interne : l'email n'est qu'un placeholder jusqu'à la complétion du profil. */
    private static final String PLACEHOLDER_DOMAIN = "@hybride.iat-academy.local";

    private final LearnerGroupRepository groupRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppSettingsService appSettingsService;
    private final AuditLogService auditLogService;
    private final MessagingService messagingService;

    @Transactional
    public GroupImportResponse importGroup(String groupName, MultipartFile file, UUID actorId) {
        String name = groupName == null ? "" : groupName.trim();
        if (name.isEmpty()) {
            throw new ApiException("Le nom du groupe est requis.");
        }
        if (groupRepository.existsByNameIgnoreCase(name)) {
            throw new ApiException("Un groupe porte déjà ce nom.");
        }
        if (file == null || file.isEmpty()) {
            throw new ApiException("Fichier Excel manquant.");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!filename.endsWith(".xlsx")) {
            throw new ApiException("Le fichier doit être au format .xlsx.");
        }

        String defaultPassword = appSettingsService.getDefaultResetPassword();
        String encodedPassword = passwordEncoder.encode(defaultPassword);

        LearnerGroup group = groupRepository.save(LearnerGroup.builder()
                .name(name)
                .createdBy(userRepository.getReferenceById(actorId))
                .build());
        messagingService.createCohortRoom(group);

        List<GroupImportResponse.RowError> errors = new ArrayList<>();
        // Détecte aussi les doublons *à l'intérieur* du fichier, pas seulement
        // contre la base : sinon la 2e ligne d'un doublon interne échouerait
        // seulement au flush, en fin de transaction.
        Set<String> seenMatricules = new HashSet<>();
        int imported = 0;

        try (InputStream in = file.getInputStream(); Workbook workbook = new XSSFWorkbook(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isBlankRow(row, formatter)) {
                    continue;
                }
                int humanRow = r + 1;
                String fullName = cell(row, 0, formatter);
                String matricule = cell(row, 1, formatter);
                String phone = cell(row, 2, formatter);

                if (fullName.isEmpty() || matricule.isEmpty() || phone.isEmpty()) {
                    errors.add(new GroupImportResponse.RowError(humanRow,
                            "Nom, CIN/matricule et téléphone sont obligatoires."));
                    continue;
                }
                if (!seenMatricules.add(matricule.toLowerCase())) {
                    errors.add(new GroupImportResponse.RowError(humanRow,
                            "CIN/matricule en double dans le fichier : " + matricule));
                    continue;
                }
                if (userRepository.existsByMatriculeIgnoreCase(matricule)) {
                    errors.add(new GroupImportResponse.RowError(humanRow,
                            "Un compte existe déjà avec le CIN/matricule " + matricule + "."));
                    continue;
                }

                String placeholderEmail = matricule.toLowerCase().replaceAll("[^a-z0-9]", "")
                        + PLACEHOLDER_DOMAIN;
                if (userRepository.existsByEmailIgnoreCase(placeholderEmail)) {
                    errors.add(new GroupImportResponse.RowError(humanRow,
                            "Conflit d'identifiant pour " + matricule + "."));
                    continue;
                }

                String[] parts = fullName.split("\\s+", 2);
                userRepository.save(User.builder()
                        .email(placeholderEmail)
                        .passwordHash(encodedPassword)
                        .fullName(fullName)
                        .firstName(parts[0])
                        .lastName(parts.length > 1 ? parts[1] : null)
                        .phone(phone)
                        .cin(matricule)
                        .matricule(matricule)
                        .country("Maroc")
                        .role(Role.ETUDIANT)
                        .enabled(true)
                        .emailVerified(false)
                        .profileCompleted(false)
                        .paymentStatus(PaymentStatus.EXEMPTED)
                        .enrollmentYear(Year.now().getValue())
                        .activatedAt(Instant.now())
                        .group(group)
                        .build());
                imported++;
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Échec de lecture du fichier Excel", e);
            throw new ApiException("Impossible de lire le fichier Excel : " + e.getMessage());
        }

        if (imported == 0) {
            // Rien d'importable : ne pas laisser un groupe vide orphelin derrière soi.
            throw new ApiException(errors.isEmpty()
                    ? "Aucune ligne exploitable dans le fichier."
                    : "Aucun compte créé — " + errors.size() + " ligne(s) en erreur : "
                            + errors.get(0).reason());
        }

        auditLogService.record(actorId, "GROUP_IMPORTED", "LearnerGroup", group.getId(),
                imported + " compte(s), " + errors.size() + " erreur(s)");

        return new GroupImportResponse(group.getId(), group.getName(), imported, defaultPassword, errors);
    }

    private static String cell(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    private static boolean isBlankRow(Row row, DataFormatter formatter) {
        for (int i = 0; i < 3; i++) {
            if (!cell(row, i, formatter).isEmpty()) {
                return false;
            }
        }
        return true;
    }
}
