package ma.iatacademy.api.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.*;
import ma.iatacademy.api.domain.enums.*;
import ma.iatacademy.api.repository.*;
import ma.iatacademy.api.service.CertificateService;
import ma.iatacademy.api.service.MessagingService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Fake data for client demos: catalog content on early modules + distinct learner scenarios.
 * Content is idempotent via marker lesson. Progress is reset when app.demo.reset-progress-on-startup=true.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private static final UUID FORMATION_ID = FormationDefaults.DEFAULT_FORMATION_ID;
    /** Changing this forces a one-shot catalog reseed on next boot. */
    private static final String DEMO_MARKER = "Embarquement IAT Academy — v2";

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final LearnerUfValidationRepository ufValidationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    // --- Demo coverage: groups/sessions/devoirs/stage dossier/certificate/messaging ---
    private final LearnerGroupRepository groupRepository;
    private final VirtualSessionRepository virtualSessionRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final AssetRepository assetRepository;
    private final LearnerDocumentRepository learnerDocumentRepository;
    private final CertificateService certificateService;
    private final MessagingService messagingService;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final MediaProperties mediaProperties;

    @Value("${app.demo.reset-progress-on-startup:true}")
    private boolean resetProgressOnStartup;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureStaffUsers();
        ensureAdditionalStaff();
        ensureDemoLearners();

        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(FORMATION_ID);
        if (modules.isEmpty()) {
            log.warn("No modules found — skip demo content seed.");
            return;
        }

        boolean demoReady = lessonRepository.findAll().stream()
                .anyMatch(l -> DEMO_MARKER.equals(l.getTitle()));
        if (!demoReady) {
            log.warn("Clearing catalog + seeding fresh demo lessons/quizzes…");
            clearCatalogContent();
            modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(FORMATION_ID);
            seedCatalog(modules);
        } else {
            log.info("Demo catalog marker present — keep lessons/quizzes.");
        }

        if (resetProgressOnStartup) {
            log.warn("Resetting learner progress + seeding demo scenarios…");
            wipeLearnerState();
            seedScenarios(modules);
            seedStageDossiers();
        }

        // Persistent across restarts (not wiped by wipeLearnerState) — idempotent via
        // existence checks inside each method, safe to call on every boot.
        seedGroupsAndSessions();
        seedAssignmentsAndSubmissions(modules);
        seedMessaging();

        log.warn("""
                Demo ready — scénarios:
                  apprenant@iat-academy.local / Apprenant@123     → UF1 en cours (module 1 validé), dossier stage entamé
                  amina.benali@demo.local / Demo@1234             → UF1 terminée, UF2 démarrée
                  youssef.idrissi@demo.local / Demo@1234          → débutant (1 section)
                  lina.cherkaoui@demo.local / Demo@1234           → zéro progression
                  salma.naji@demo.local / Demo@1234               → année 2 ouverte
                  karim.ouafi@demo.local / Demo@1234              → paiement / activation en attente
                  khadija.mansouri@demo.local / Demo@1234         → dossier stage & soutenance complets, certificat émis
                  admin@iat-academy.local / Admin@123             → Directeur (ADMIN)
                  superadmin@iat-academy.local / SuperAdmin@123   → Super Admin
                  formateur@iat-academy.local / Formateur@123     → Formateur
                  support@demo.local / Demo@1234                  → Support
                Groupes : Cohorte 2026-A (avec membres + sessions live), Cohorte 2027-A (en attente, vide)
                Devoirs : 1 devoir avec 1 copie à corriger + 1 copie déjà notée
                Messagerie : conversation directe apprenant ↔ formateur pré-remplie
                """);
    }

    private void seedCatalog(List<ModuleEntity> modules) {
        if (modules.size() < 4) {
            log.warn("Not enough modules for demo catalog (need ≥4, got {}).", modules.size());
            return;
        }

        seedModuleRich(modules.get(0), MODULE_1_LESSONS);
        seedModuleRich(modules.get(1), MODULE_2_LESSONS);
        seedModuleRich(modules.get(2), MODULE_3_LESSONS);
        seedModuleRich(modules.get(3), MODULE_4_LESSONS);

        if (modules.size() > 4) seedModuleRich(modules.get(4), MODULE_5_LESSONS);
        if (modules.size() > 5) seedModuleRich(modules.get(5), MODULE_6_LESSONS);
        if (modules.size() > 6) seedModuleRich(modules.get(6), MODULE_7_LESSONS);
        if (modules.size() > 7) seedModuleRich(modules.get(7), MODULE_8_LESSONS);
        if (modules.size() > 8) seedModuleRich(modules.get(8), MODULE_9_LESSONS);
        if (modules.size() > 9) seedModuleRich(modules.get(9), MODULE_10_LESSONS);
        if (modules.size() > 10) seedModuleRich(modules.get(10), MODULE_11_LESSONS);
        if (modules.size() > 11) seedModuleRich(modules.get(11), MODULE_12_LESSONS);
        if (modules.size() > 12) seedModuleRich(modules.get(12), MODULE_13_LESSONS);
        if (modules.size() > 13) seedModuleRich(modules.get(13), MODULE_14_LESSONS);
        if (modules.size() > 14) seedModuleRich(modules.get(14), MODULE_15_LESSONS);
        if (modules.size() > 15) seedModuleRich(modules.get(15), MODULE_16_LESSONS);
        if (modules.size() > 16) seedModuleRich(modules.get(16), MODULE_17_LESSONS);
        if (modules.size() > 17) seedModuleRich(modules.get(17), MODULE_18_LESSONS);

        seedFinModuleQuiz(modules.get(0), "Quiz — Techniques de communication", QUIZ_COM);
        seedFinModuleQuiz(modules.get(1), "Quiz — Français pro", QUIZ_FR);
        seedFinModuleQuiz(modules.get(2), "Quiz — Anglais aviation", QUIZ_EN);
        seedFinModuleQuiz(modules.get(3), "Quiz — Comportement & attitude", QUIZ_ATTITUDE);
    }

    private void clearCatalogContent() {
        wipeLearnerState();
        entityManager.createQuery("DELETE FROM AnswerOption").executeUpdate();
        entityManager.createQuery("DELETE FROM Question").executeUpdate();
        entityManager.createQuery("DELETE FROM Quiz").executeUpdate();
        entityManager.createQuery("DELETE FROM LessonBlock").executeUpdate();
        entityManager.createQuery("DELETE FROM Lesson").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    private void wipeLearnerState() {
        entityManager.createQuery("DELETE FROM LessonProgress").executeUpdate();
        entityManager.createQuery("DELETE FROM QuizAttempt").executeUpdate();
        entityManager.createQuery("DELETE FROM Certificate").executeUpdate();
        entityManager.createQuery("DELETE FROM LearnerUfValidation").executeUpdate();
        entityManager.createQuery("DELETE FROM LearnerDocument").executeUpdate();
        entityManager.flush();
    }

    private void ensureStaffUsers() {
        upsertUser("formateur@iat-academy.local", "Formateur@123", "Sara Formateur",
                Role.FORMATEUR, PaymentStatus.EXEMPTED, true, false, null);
    }

    /** Enrichit les comptes staff déjà créés par DataInitializer (admin/superadmin — mots
     *  de passe inchangés) avec un nom réel, plus un compte SUPPORT — aucun des 3 rôles
     *  staff n'était différencié au-delà du seul "Sara Formateur" jusqu'ici. */
    private void ensureAdditionalStaff() {
        upsertUser("admin@iat-academy.local", "Admin@123", "Karim Bensouda — Directeur pédagogique",
                Role.ADMIN, PaymentStatus.EXEMPTED, true, false, null);
        upsertUser("superadmin@iat-academy.local", "SuperAdmin@123", "Yasmine Aloui — Super Admin",
                Role.SUPER_ADMIN, PaymentStatus.EXEMPTED, true, false, null);
        upsertUser("support@demo.local", "Demo@1234", "Sami Radi — Support",
                Role.SUPPORT, PaymentStatus.EXEMPTED, true, false, null);
    }

    private void ensureDemoLearners() {
        int year = Year.now().getValue();
        upsertLearner("apprenant@iat-academy.local", "Apprenant@123", "Nora El Amrani",
                year, true, false, "0612001100", "BE123456", LocalDate.of(2002, 4, 12));
        upsertLearner("amina.benali@demo.local", "Demo@1234", "Amina Benali",
                year, true, false, "0612002200", "BH654321", LocalDate.of(2001, 9, 3));
        upsertLearner("youssef.idrissi@demo.local", "Demo@1234", "Youssef Idrissi",
                year, true, false, "0612003300", "BJ998877", LocalDate.of(2003, 1, 22));
        upsertLearner("lina.cherkaoui@demo.local", "Demo@1234", "Lina Cherkaoui",
                year, true, false, "0612004400", "BK112233", LocalDate.of(2002, 11, 8));
        upsertLearner("salma.naji@demo.local", "Demo@1234", "Salma Naji",
                year - 1, true, true, "0612005500", "BL445566", LocalDate.of(2000, 6, 15));
        // Pending activation — visible in admin users list
        upsertUser("karim.ouafi@demo.local", "Demo@1234", "Karim Ouafi",
                Role.ETUDIANT, PaymentStatus.PENDING, false, false, year);
        // Stage & soutenance complets — voir seedScenarios/seedStageDossiers.
        upsertLearner("khadija.mansouri@demo.local", "Demo@1234", "Khadija Mansouri",
                year - 1, true, true, "0612006600", "BM778899", LocalDate.of(2000, 3, 5));
    }

    private User upsertLearner(
            String email, String password, String fullName,
            int enrollmentYear, boolean activated, boolean year2,
            String phone, String cin, LocalDate birthDate
    ) {
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(Role.ETUDIANT)
                    .build();
            log.warn("Demo learner created: {} / {}", email, password);
        }
        user.setFullName(fullName);
        user.setEnabled(true);
        user.setPaymentStatus(PaymentStatus.PAID);
        user.setEnrollmentYear(enrollmentYear);
        user.setActivatedAt(activated ? Instant.now().minusSeconds(86400L * 40) : null);
        user.setYear2AccessEnabled(year2);
        user.setPhone(phone);
        user.setCin(cin);
        user.setBirthDate(birthDate);
        user.setAddress("Casablanca — Maroc");
        return userRepository.save(user);
    }

    private void upsertUser(
            String email, String password, String fullName,
            Role role, PaymentStatus payment, boolean enabled, boolean year2, Integer enrollmentYear
    ) {
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(role)
                    .build();
            log.warn("Demo user created: {} / {} ({})", email, password, role);
        }
        user.setFullName(fullName);
        user.setEnabled(enabled);
        user.setPaymentStatus(payment);
        user.setEnrollmentYear(enrollmentYear);
        user.setActivatedAt(enabled && role != Role.ETUDIANT ? Instant.now()
                : (enabled ? Instant.now() : null));
        if (role == Role.ETUDIANT && payment == PaymentStatus.PENDING) {
            user.setActivatedAt(null);
        }
        user.setYear2AccessEnabled(year2);
        userRepository.save(user);
    }

    private void seedScenarios(List<ModuleEntity> modules) {
        if (modules.isEmpty()) return;

        User apprenant = requireUser("apprenant@iat-academy.local");
        User amina = requireUser("amina.benali@demo.local");
        User youssef = requireUser("youssef.idrissi@demo.local");
        User salma = requireUser("salma.naji@demo.local");
        User admin = userRepository.findByEmailIgnoreCase("admin@iat-academy.local").orElse(null);

        // Nora — module 1 validé, module 2 en cours
        completeModule(apprenant, modules.get(0));
        if (modules.size() > 1) {
            List<Lesson> m2 = lessonsOf(modules.get(1));
            for (int i = 0; i < Math.min(2, m2.size()); i++) {
                completeLesson(apprenant, m2.get(i));
            }
        }

        // Amina — toute UF1 validée, premier module UF2 démarré
        for (int i = 0; i < Math.min(4, modules.size()); i++) {
            completeModule(amina, modules.get(i));
        }
        if (modules.size() > 4) {
            List<Lesson> uf2first = lessonsOf(modules.get(4));
            if (!uf2first.isEmpty()) {
                completeLesson(amina, uf2first.get(0));
            }
        }

        // Youssef — tout début
        List<Lesson> m1 = lessonsOf(modules.get(0));
        if (!m1.isEmpty()) {
            completeLesson(youssef, m1.get(0));
        }

        // Lina — volontairement vide

        // Salma — année 1 content + UF5 validated + year2 flag
        for (int i = 0; i < Math.min(18, modules.size()); i++) {
            ModuleEntity mod = modules.get(i);
            if (!lessonsOf(mod).isEmpty()) {
                completeModule(salma, mod);
            }
        }
        if (admin != null) {
            validateUf(salma, "UF 5", admin, "Stage validé — scénario démo année 2");
        }
        salma.setYear2AccessEnabled(true);
        userRepository.save(salma);

        // Khadija — parcours complet + soutenance validée (voir seedStageDossiers pour le
        // dossier de stage et le certificat émis).
        User khadija = requireUser("khadija.mansouri@demo.local");
        for (int i = 0; i < Math.min(18, modules.size()); i++) {
            ModuleEntity mod = modules.get(i);
            if (!lessonsOf(mod).isEmpty()) {
                completeModule(khadija, mod);
            }
        }
        if (admin != null) {
            validateUf(khadija, "UF 5", admin, "Stage validé.");
            validateUf(khadija, "Soutenance", admin, "Soutenance validée — dossier complet.");
        }
    }

    private User requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Demo user missing: " + email));
    }

    private List<Lesson> lessonsOf(ModuleEntity module) {
        return lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId());
    }

    private void completeModule(User user, ModuleEntity module) {
        lessonsOf(module).forEach(l -> completeLesson(user, l));
        quizRepository.findByModuleIdAndQuizType(module.getId(), QuizType.FIN_MODULE)
                .ifPresent(quiz -> passQuiz(user, quiz));
    }

    private void completeLesson(User user, Lesson lesson) {
        if (lessonProgressRepository.findByUserIdAndLessonId(user.getId(), lesson.getId()).isPresent()) {
            return;
        }
        lessonProgressRepository.save(LessonProgress.builder()
                .user(user)
                .lesson(lesson)
                .videoWatchedPercent(100)
                .completed(true)
                .completedAt(Instant.now().minusSeconds(3600))
                .build());
    }

    private void passQuiz(User user, Quiz quiz) {
        boolean already = quizAttemptRepository
                .findFirstByUserIdAndQuizIdAndStatusOrderBySubmittedAtDesc(
                        user.getId(), quiz.getId(), AttemptStatus.PASSED)
                .isPresent();
        if (already) return;
        quizAttemptRepository.save(QuizAttempt.builder()
                .user(user)
                .quiz(quiz)
                .startedAt(Instant.now().minusSeconds(900))
                .submittedAt(Instant.now().minusSeconds(120))
                .expiresAt(null)
                .score(BigDecimal.valueOf(86))
                .status(AttemptStatus.PASSED)
                .questionOrder(List.of())
                .answers(Map.of())
                .build());
    }

    private void validateUf(User learner, String ufCode, User director, String note) {
        LearnerUfValidation row = ufValidationRepository
                .findByLearnerIdAndUfCode(learner.getId(), ufCode)
                .orElseGet(() -> LearnerUfValidation.builder()
                        .learner(learner)
                        .ufCode(ufCode)
                        .build());
        row.setValidated(true);
        row.setValidatedAt(Instant.now().minusSeconds(86400));
        row.setValidatedBy(director);
        row.setNote(note);
        ufValidationRepository.save(row);
    }

    // ------------------------------------------------------------------
    // Stage & Soutenance : dossier en cours (Nora) + dossier complet + certificat (Khadija).
    // LearnerDocument/Certificate sont wipés à chaque redémarrage (wipeLearnerState) donc
    // pas de garde d'idempotence nécessaire ici, comme pour completeLesson/passQuiz.
    // ------------------------------------------------------------------

    private void seedStageDossiers() {
        User admin = userRepository.findByEmailIgnoreCase("admin@iat-academy.local").orElse(null);
        if (admin == null) {
            log.warn("No admin user — skip stage dossier demo seed.");
            return;
        }

        // Nora — dossier en cours : convention école déjà déposée par la direction,
        // rien encore côté apprenant (elle peut illustrer le dépôt en direct pendant la démo).
        User nora = requireUser("apprenant@iat-academy.local");
        saveLearnerDocument(nora, LearnerDocType.CONVENTION_ECOLE,
                ensureDemoAsset("convention-ecole-nora.pdf", "stage"), admin, "Signée par la direction.");

        // Khadija — dossier complet (5 documents) + soutenance validée + certificat émis.
        User khadija = requireUser("khadija.mansouri@demo.local");
        saveLearnerDocument(khadija, LearnerDocType.CONVENTION_ECOLE,
                ensureDemoAsset("convention-ecole-khadija.pdf", "stage"), admin, "Signée par la direction.");
        saveLearnerDocument(khadija, LearnerDocType.ASSURANCE,
                ensureDemoAsset("attestation-assurance-khadija.pdf", "stage"), admin, "Assurance stage validée.");
        saveLearnerDocument(khadija, LearnerDocType.CONVENTION_ENTREPRISE,
                ensureDemoAsset("convention-entreprise-khadija.pdf", "stage"), khadija, "Signée par l'entreprise d'accueil.");
        saveLearnerDocument(khadija, LearnerDocType.RAPPORT_STAGE,
                ensureDemoAsset("rapport-stage-khadija.pdf", "stage"), khadija, null);
        saveLearnerDocument(khadija, LearnerDocType.PRESENTATION_SOUTENANCE,
                ensureDemoAsset("presentation-soutenance-khadija.pdf", "stage"), khadija, null);

        certificateService.issue(khadija.getId(), FORMATION_ID);
    }

    private void saveLearnerDocument(User learner, LearnerDocType type, Asset asset, User uploadedBy, String notes) {
        learnerDocumentRepository.save(LearnerDocument.builder()
                .learner(learner)
                .docType(type)
                .asset(asset)
                .uploadedBy(uploadedBy)
                .notes(notes)
                .status(LearnerDocStatus.SUBMITTED)
                .build());
    }

    // ------------------------------------------------------------------
    // Groupes / Sessions live — persistants (non wipés), donc idempotence par vérification
    // d'existence plutôt que par table wipée à chaque boot.
    // ------------------------------------------------------------------

    private void seedGroupsAndSessions() {
        LearnerGroup cohortA = ensureGroup("Cohorte 2026-A", "2026-A", EnrollmentMode.HYBRIDE);
        ensureGroup("Cohorte 2027-A (en attente)", "2027-A", EnrollmentMode.EN_LIGNE); // volontairement vide

        assignToGroupIfUnassigned("apprenant@iat-academy.local", cohortA);
        assignToGroupIfUnassigned("amina.benali@demo.local", cohortA);
        assignToGroupIfUnassigned("youssef.idrissi@demo.local", cohortA);

        User formateur = requireUser("formateur@iat-academy.local");
        ensureSession(cohortA, "Point d'étape UF1", SessionProvider.GOOGLE_MEET,
                "https://meet.google.com/demo-iat-academy", Instant.now().minusSeconds(86400L * 3), 45, formateur);
        ensureSession(cohortA, "Atelier anglais aviation", SessionProvider.ZOOM,
                "https://zoom.us/j/0000000000", Instant.now().plusSeconds(86400L * 2), 60, formateur);
    }

    private LearnerGroup ensureGroup(String name, String code, EnrollmentMode mode) {
        return groupRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(g -> g.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    LearnerGroup group = LearnerGroup.builder()
                            .name(name)
                            .code(code)
                            .enrollmentMode(mode)
                            .build();
                    groupRepository.save(group);
                    messagingService.createCohortRoom(group);
                    log.warn("Demo group created: {}", name);
                    return group;
                });
    }

    /** Réaffectation implicite : un apprenant n'appartient qu'à un seul groupe — ne rien
     *  faire s'il est déjà dans un groupe (évite d'écraser un état de démo existant). */
    private void assignToGroupIfUnassigned(String email, LearnerGroup group) {
        User user = requireUser(email);
        if (user.getGroup() != null) {
            return;
        }
        user.setGroup(group);
        userRepository.save(user);
    }

    private void ensureSession(
            LearnerGroup group, String title, SessionProvider provider, String joinUrl,
            Instant scheduledAt, int durationMinutes, User createdBy
    ) {
        boolean exists = virtualSessionRepository.findByGroupIdOrderByScheduledAtAsc(group.getId()).stream()
                .anyMatch(s -> s.getTitle().equals(title));
        if (exists) {
            return;
        }
        virtualSessionRepository.save(VirtualSession.builder()
                .group(group)
                .title(title)
                .provider(provider)
                .joinUrl(joinUrl)
                .scheduledAt(scheduledAt)
                .durationMinutes(durationMinutes)
                .createdBy(createdBy)
                .build());
    }

    // ------------------------------------------------------------------
    // Devoirs & soumissions — persistants, idempotence par titre.
    // ------------------------------------------------------------------

    private void seedAssignmentsAndSubmissions(List<ModuleEntity> modules) {
        if (modules.isEmpty()) {
            return;
        }
        Assignment assignment = ensureAssignment(modules.get(0), "Fiche réflexe accueil passager",
                "Rédigez une fiche synthétique (1 page) sur la gestion d'un passager stressé.",
                Instant.now().plusSeconds(86400L * 5), BigDecimal.valueOf(20));

        User apprenant = requireUser("apprenant@iat-academy.local");
        User amina = requireUser("amina.benali@demo.local");
        User formateur = requireUser("formateur@iat-academy.local");
        Asset submissionAsset = ensureDemoAsset("devoir-fiche-reflexe.pdf", "devoirs");

        // Nora — copie déposée, pas encore corrigée (à montrer dans /admin/gradebook).
        ensureSubmission(assignment, apprenant, submissionAsset,
                Instant.now().minusSeconds(3600L * 6), SubmissionStatus.SUBMITTED, null, null, null);
        // Amina — copie déjà corrigée (à montrer dans le bulletin apprenant).
        ensureSubmission(assignment, amina, submissionAsset,
                Instant.now().minusSeconds(86400L * 2), SubmissionStatus.GRADED,
                BigDecimal.valueOf(17), "Bonne structure, quelques répétitions à éviter.", formateur);
    }

    private Assignment ensureAssignment(ModuleEntity module, String title, String description, Instant dueAt, BigDecimal maxScore) {
        return assignmentRepository.findByModuleIdOrderByDueAtAsc(module.getId()).stream()
                .filter(a -> a.getTitle().equals(title))
                .findFirst()
                .orElseGet(() -> assignmentRepository.save(Assignment.builder()
                        .module(module)
                        .title(title)
                        .description(description)
                        .dueAt(dueAt)
                        .maxScore(maxScore)
                        .build()));
    }

    private void ensureSubmission(
            Assignment assignment, User user, Asset asset, Instant submittedAt,
            SubmissionStatus status, BigDecimal grade, String feedback, User gradedBy
    ) {
        if (submissionRepository.findByAssignmentIdAndUserId(assignment.getId(), user.getId()).isPresent()) {
            return;
        }
        submissionRepository.save(Submission.builder()
                .assignment(assignment)
                .user(user)
                .asset(asset)
                .submittedAt(submittedAt)
                .status(status)
                .grade(grade)
                .feedback(feedback)
                .gradedBy(gradedBy)
                .gradedAt(gradedBy != null ? submittedAt.plusSeconds(3600) : null)
                .build());
    }

    // ------------------------------------------------------------------
    // Messagerie — une conversation directe apprenant ↔ formateur, pré-remplie.
    // ------------------------------------------------------------------

    private void seedMessaging() {
        User nora = requireUser("apprenant@iat-academy.local");
        User formateur = requireUser("formateur@iat-academy.local");
        UUID conversationId = messagingService.getOrCreateDirect(nora.getId(), formateur.getId());
        if (!messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).isEmpty()) {
            return;
        }
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalStateException("Conversation démo introuvable juste après création."));
        saveMessage(conversation, nora, "Bonjour, j'ai une question sur le devoir du module 1.");
        saveMessage(conversation, formateur, "Bonjour Nora, bien sûr — dites-moi ce qui vous bloque.");
        saveMessage(conversation, nora, "Je ne suis pas sûre du format attendu pour la fiche réflexe.");
    }

    private void saveMessage(Conversation conversation, User sender, String body) {
        messageRepository.save(Message.builder().conversation(conversation).sender(sender).body(body).build());
    }

    // ------------------------------------------------------------------
    // Fichier factice réutilisé par toutes les démos ci-dessus (devoirs + documents de
    // stage) — un vrai PDF minimal (pas juste une ligne de texte) pour que le rendu de
    // miniature et l'ouverture "Voir/Voir la copie" fonctionnent réellement en démo.
    // ------------------------------------------------------------------

    private static final String DEMO_PDF_TEXT = """
            %PDF-1.4
            1 0 obj
            << /Type /Catalog /Pages 2 0 R >>
            endobj
            2 0 obj
            << /Type /Pages /Kids [3 0 R] /Count 1 >>
            endobj
            3 0 obj
            << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 300 300] /Contents 5 0 R >>
            endobj
            4 0 obj
            << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
            endobj
            5 0 obj
            << /Length 60 >>
            stream
            BT /F1 18 Tf 30 150 Td (Document de demonstration IAT Academy) Tj ET
            endstream
            endobj
            xref
            0 6
            0000000000 65535 f
            trailer
            << /Size 6 /Root 1 0 R >>
            startxref
            0
            %%EOF
            """;

    private Asset ensureDemoAsset(String filename, String subfolder) {
        return assetRepository.findFirstByFilename(filename)
                .orElseGet(() -> {
                    try {
                        Path dir = Path.of(mediaProperties.getRootPath(), "demo", subfolder).toAbsolutePath().normalize();
                        Files.createDirectories(dir);
                        Path file = dir.resolve(filename);
                        byte[] bytes = DEMO_PDF_TEXT.getBytes(StandardCharsets.UTF_8);
                        if (!Files.exists(file)) {
                            Files.write(file, bytes);
                        }
                        return assetRepository.save(Asset.builder()
                                .filename(filename)
                                .storagePath(file.toString())
                                .mimeType("application/pdf")
                                .sizeBytes(bytes.length)
                                .assetKind("PDF")
                                .build());
                    } catch (IOException e) {
                        throw new IllegalStateException("Impossible de créer le fichier démo " + filename, e);
                    }
                });
    }

    private void seedModuleRich(ModuleEntity module, List<LessonSpec> specs) {
        int order = 0;
        for (LessonSpec spec : specs) {
            Lesson lesson = lessonRepository.save(Lesson.builder()
                    .module(module)
                    .title(spec.title())
                    .orderIndex(order++)
                    .published(true)
                    .build());
            lessonBlockRepository.save(LessonBlock.builder()
                    .lesson(lesson)
                    .blockType(BlockType.TEXT)
                    .orderIndex(0)
                    .content(Map.of("body", spec.html()))
                    .build());
        }
    }

    private void seedFinModuleQuiz(ModuleEntity module, String title, List<QuestionSpec> questions) {
        Quiz quiz = Quiz.builder()
                .title(title)
                .quizType(QuizType.FIN_MODULE)
                .module(module)
                .passingScore(60)
                .maxAttempts(3)
                .timeLimitSeconds(900)
                .randomizeQuestions(false)
                .randomizeOptions(false)
                .retryDelayMinutes(60)
                .blocking(true)
                .published(true)
                .build();

        int qi = 0;
        for (QuestionSpec qs : questions) {
            Question q = Question.builder()
                    .quiz(quiz)
                    .prompt(qs.prompt())
                    .questionType(qs.type())
                    .orderIndex(qi++)
                    .explanation(qs.explanation())
                    .build();
            int oi = 0;
            for (OptionSpec opt : qs.options()) {
                q.getOptions().add(AnswerOption.builder()
                        .question(q)
                        .label(opt.label())
                        .correct(opt.correct())
                        .orderIndex(oi++)
                        .build());
            }
            quiz.getQuestions().add(q);
        }
        quizRepository.save(quiz);
    }

    private record LessonSpec(String title, String html) {}
    private record OptionSpec(String label, boolean correct) {}
    private record QuestionSpec(String prompt, QuestionType type, String explanation, List<OptionSpec> options) {}

    private static final List<LessonSpec> MODULE_1_LESSONS = List.of(
            new LessonSpec(DEMO_MARKER, """
                    <h1>Embarquement IAT Academy</h1>
                    <p>Bienvenue à bord du cycle <strong>Hôtesse / Steward / Tourisme &amp; Aéronautique</strong>.</p>
                    <h2>Ce que vous validez</h2>
                    <ul>
                      <li>11 unités de formation sur 2 ans</li>
                      <li>36 modules + stage + soutenance</li>
                      <li>Quiz bloquants et suivi de progression</li>
                    </ul>
                    <blockquote>Astuce démo : naviguez via la sidebar sans recharger tout le shell.</blockquote>
                    """),
            new LessonSpec("Écoute active & reformulation", """
                    <h1>Écoute active</h1>
                    <p>Reformuler, clarifier, confirmer — les 3 gestes de l'accueil pro.</p>
                    <ol><li>Accuser réception</li><li>Reformuler</li><li>Proposer une action</li></ol>
                    """),
            new LessonSpec("Communication en situation de stress", """
                    <h1>Stress opérationnel</h1>
                    <p>Retards, correspondances manquées, files longues : garder le calme et la clarté.</p>
                    """),
            new LessonSpec("Briefing oral efficace", """
                    <h1>Briefing</h1>
                    <p>Structure START : Situation, Tâche, Action, Résultat, Timing.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_2_LESSONS = List.of(
            new LessonSpec("Français de service", """
                    <h1>Français de service</h1>
                    <p>Formules d'accueil, politesse, traitement des réclamations.</p>
                    """),
            new LessonSpec("Rédaction professionnelle", """
                    <h1>Écrits pro</h1>
                    <p>Mails, notes de service, comptes-rendus de vacation.</p>
                    """),
            new LessonSpec("Annonces passagers", """
                    <h1>Annonces</h1>
                    <p>Diction, débit, message standard vs message de crise.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_3_LESSONS = List.of(
            new LessonSpec("English for aviation — basics", """
                    <h1>Aviation English</h1>
                    <p>Gate, boarding, delay, connecting flight — vocabulaire landside.</p>
                    """),
            new LessonSpec("Passenger assistance phrases", """
                    <h1>Assistance phrases</h1>
                    <p>How may I help you? / Boarding is now complete.</p>
                    """),
            new LessonSpec("Listening drill", """
                    <h1>Listening</h1>
                    <p>Comprendre une annonce en anglais sous bruit ambiant (simulation).</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_4_LESSONS = List.of(
            new LessonSpec("Posture professionnelle", """
                    <h1>Posture professionnelle</h1>
                    <p>La première impression se joue en quelques secondes, avant même le premier mot.</p>
                    <ul>
                      <li>Tenue impeccable, dos droit, regard direct, sourire naturel</li>
                      <li>Gestes mesurés, mains visibles — jamais bras croisés face à un passager</li>
                      <li>Voix calme, débit régulier, articulation soignée</li>
                    </ul>
                    <p>Une posture ouverte rassure le passager avant même qu'il n'exprime sa demande.</p>
                    """),
            new LessonSpec("Communication non verbale", """
                    <h1>Communication non verbale</h1>
                    <p>Une grande partie d'un message perçu passe par le corps, pas par les mots.</p>
                    <ul>
                      <li><strong>Regard</strong> : contact visuel régulier, sans fixer</li>
                      <li><strong>Distance</strong> : respecter l'espace personnel du passager</li>
                      <li><strong>Mimique</strong> : un visage fermé se lit souvent comme du désintérêt</li>
                    </ul>
                    <blockquote>Un sourcil froncé peut annuler la phrase la plus rassurante.</blockquote>
                    """),
            new LessonSpec("Gestion du stress client", """
                    <h1>Gestion du stress client</h1>
                    <p>Un passager stressé (retard, correspondance ratée) réagit d'abord à l'émotion, pas à l'information.</p>
                    <ol>
                      <li>Accueillir l'émotion : « Je comprends, c'est frustrant. »</li>
                      <li>Reformuler le besoin réel derrière la colère</li>
                      <li>Proposer une action concrète, même partielle</li>
                    </ol>
                    <p>Le calme de l'agent est le premier outil de désescalade.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_5_LESSONS = List.of(
            new LessonSpec("Rôle de l'accompagnateur de groupe", """
                    <h1>Rôle de l'accompagnateur</h1>
                    <p>L'accompagnateur fait découvrir un territoire et son patrimoine, en individuel ou en groupe, lors de circuits, visites ou excursions.</p>
                    <ul>
                      <li>Repérage du terrain et conception d'itinéraires en amont</li>
                      <li>Réservations : transport, repas, billets d'entrée</li>
                      <li>Solide préparation documentaire + aisance orale</li>
                    </ul>
                    """),
            new LessonSpec("Dynamique de groupe et animation", """
                    <h1>Dynamique de groupe</h1>
                    <p>Créer du lien et de l'interaction pour transformer une visite en expérience vivante et conviviale.</p>
                    <ul>
                      <li>Favoriser les échanges entre participants</li>
                      <li>Adapter le rythme et le discours au public (âge, langue, centres d'intérêt)</li>
                      <li>Répartir la parole, relancer les silences</li>
                    </ul>
                    """),
            new LessonSpec("Gérer les imprévus en circuit", """
                    <h1>Gérer l'imprévu</h1>
                    <p>Réajuster le programme sans altérer l'expérience du groupe est une compétence centrale du métier.</p>
                    <p>Retard de car, site fermé, participant isolé : anticiper un plan B systématique.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_6_LESSONS = List.of(
            new LessonSpec("Standards d'accueil en hôtellerie", """
                    <h1>Standards d'accueil</h1>
                    <p>Les standards d'accueil garantissent une expérience positive qui influence satisfaction, fidélité et réputation.</p>
                    <ul>
                      <li>Courtoisie et discrétion à tous les niveaux</li>
                      <li>Disponibilité constante, sans être intrusif</li>
                      <li>Tolérance zéro sur 3 points : propreté, sécurité, accueil</li>
                    </ul>
                    """),
            new LessonSpec("Les fondamentaux du service", """
                    <h1>Fondamentaux du service</h1>
                    <p>Posture, langage et satisfaction client forment le socle du service d'accueil.</p>
                    <p>Les normes qualité (type ISO 9001 ou classement par étoiles) formalisent des dizaines de critères objectifs — propreté, ponctualité, personnalisation de l'accueil.</p>
                    """),
            new LessonSpec("Traiter une réclamation", """
                    <h1>Traiter une réclamation</h1>
                    <ol>
                      <li>Écouter sans interrompre</li>
                      <li>Reformuler pour montrer la compréhension</li>
                      <li>Proposer une solution ou escalader clairement</li>
                    </ol>
                    <p>Une réclamation bien traitée renforce souvent la fidélité plus qu'un parcours sans accroc.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_7_LESSONS = List.of(
            new LessonSpec("Parcours passager : check-in à l'embarquement", """
                    <h1>Parcours passager</h1>
                    <p>Enregistrement, contrôle de sûreté, contrôle des passeports, zone d'embarquement : chaque étape est un point de gestion de flux.</p>
                    <p>Des systèmes de gestion des flux (capteurs, écrans) surveillent en temps réel la circulation pour fluidifier ces zones clés.</p>
                    """),
            new LessonSpec("Correspondances et affichage", """
                    <h1>Correspondances</h1>
                    <p>Les écrans d'aéroport affichent portes, horaires, retards éventuels et changements de porte liés aux correspondances.</p>
                    <p>La direction d'escale planifie l'activité des équipes selon le programme de vol et prépare des mesures correctives en cas de retard, surréservation ou annulation.</p>
                    """),
            new LessonSpec("Gérer un retard ou une annulation", """
                    <h1>Retard / annulation</h1>
                    <ul>
                      <li>Informer tôt, même sans certitude totale</li>
                      <li>Rassurer sur la prise en charge (correspondance, hébergement si besoin)</li>
                      <li>Rediriger vers le bon interlocuteur (compagnie, escale)</li>
                    </ul>
                    """)
    );

    private static final List<LessonSpec> MODULE_8_LESSONS = List.of(
            new LessonSpec("Qu'est-ce qu'un GDS ?", """
                    <h1>Le GDS</h1>
                    <p>Un Global Distribution System est un réseau informatisé qui relie prestataires (compagnies, hôtels, loueurs) et agences de voyage.</p>
                    <p>Il centralise en temps réel disponibilités, tarifs et réservations sur l'ensemble de l'industrie du voyage.</p>
                    """),
            new LessonSpec("Amadeus, Sabre, Galileo", """
                    <h1>Panorama des GDS</h1>
                    <ul>
                      <li><strong>Amadeus</strong> — leader en Europe</li>
                      <li><strong>Sabre</strong> — fort en Amérique du Nord</li>
                      <li><strong>Galileo</strong> (groupe Travelport) — complète l'offre avec Apollo/Worldspan</li>
                    </ul>
                    <p>Via un GDS, l'agent gère réservations, émission de billets et itinéraires complets dans un seul système.</p>
                    """),
            new LessonSpec("Construire un dossier voyage", """
                    <h1>Dossier voyage</h1>
                    <ol>
                      <li>Recueillir les besoins (dates, budget, contraintes)</li>
                      <li>Comparer disponibilités et tarifs via le GDS</li>
                      <li>Émettre, confirmer, transmettre les documents de voyage</li>
                    </ol>
                    """)
    );

    private static final List<LessonSpec> MODULE_9_LESSONS = List.of(
            new LessonSpec("Les 4 forces du vol", """
                    <h1>Les 4 forces du vol</h1>
                    <p>Tout aéronef en vol est soumis à 4 forces : <strong>portance</strong>, <strong>traînée</strong>, <strong>poids</strong>, <strong>poussée</strong>.</p>
                    <ul>
                      <li>La portance naît de la différence de pression entre extrados et intrados de l'aile</li>
                      <li>La traînée s'oppose à l'avancement (parasite + induite)</li>
                      <li>La poussée des moteurs doit compenser la traînée pour maintenir la vitesse</li>
                    </ul>
                    """),
            new LessonSpec("Structure de l'avion", """
                    <h1>Structure de l'avion</h1>
                    <p>Le fuselage abrite équipage, passagers et cargaison — robuste mais léger pour optimiser les performances.</p>
                    <p>Voilure, empennage, train d'atterrissage et moteurs complètent l'architecture générale d'un avion de ligne.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_10_LESSONS = List.of(
            new LessonSpec("The four forces of flight", """
                    <h1>Four forces of flight</h1>
                    <p>Every aircraft in flight is affected by four forces: <strong>lift</strong>, <strong>drag</strong>, <strong>weight</strong> and <strong>thrust</strong>.</p>
                    <ul>
                      <li>Lift is generated by the pressure difference above and below the wing</li>
                      <li>Drag opposes forward motion</li>
                      <li>Thrust from the engines must overcome drag to maintain speed</li>
                    </ul>
                    """),
            new LessonSpec("Aircraft structure vocabulary", """
                    <h1>Aircraft structure</h1>
                    <p>Key terms: fuselage, wings, empennage (tail), landing gear, engines.</p>
                    <p>The fuselage houses the crew, passengers and cargo — strong enough to withstand flight loads, yet light for performance.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_11_LESSONS = List.of(
            new LessonSpec("Le droit aérien en bref", """
                    <h1>Droit aérien</h1>
                    <p>Le transport aérien s'appuie sur des conventions internationales (Chicago, Montréal) et sur les règlements de l'OACI/IATA transposés par chaque État.</p>
                    <p>Ils encadrent responsabilité du transporteur, droits des passagers et sécurité des opérations.</p>
                    """),
            new LessonSpec("Marchandises dangereuses (DGR)", """
                    <h1>Marchandises dangereuses</h1>
                    <p>Le manuel <strong>IATA Dangerous Goods Regulations (DGR)</strong> est la référence mondiale pour l'expédition de matières dangereuses par avion — environ 3 000 articles et substances répertoriés.</p>
                    <ul>
                      <li>Classer, marquer, emballer, étiqueter et documenter chaque envoi</li>
                      <li>Concerne transporteurs, expéditeurs, agents de fret et passagers</li>
                    </ul>
                    """),
            new LessonSpec("Sûreté aéroportuaire", """
                    <h1>Sûreté aéroportuaire</h1>
                    <p>Contrôles des passagers, du fret et des bagages visent à prévenir tout acte d'intervention illicite.</p>
                    <p>Chaque agent en contact avec le public participe à la chaîne de sûreté : vigilance, signalement, respect des procédures.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_12_LESSONS = List.of(
            new LessonSpec("Position latérale de sécurité (PLS)", """
                    <h1>PLS</h1>
                    <p>La PLS allonge sur le côté une personne inconsciente qui respire, pour dégager ses voies aériennes.</p>
                    <p>Elle réduit fortement le risque d'obstruction et facilite l'évacuation naturelle des liquides (salive, vomissements).</p>
                    """),
            new LessonSpec("Étouffement : manœuvre de Heimlich", """
                    <h1>Étouffement</h1>
                    <p>Chez l'adulte : compressions abdominales (Heimlich) après échec des claques dans le dos.</p>
                    <p>Chez le nourrisson (&lt; 1 an) : on alterne claques dans le dos et compressions thoraciques, jamais la manœuvre de Heimlich classique.</p>
                    """),
            new LessonSpec("Les gestes qui sauvent", """
                    <h1>Gestes qui sauvent</h1>
                    <ul>
                      <li>Protéger, alerter, secourir — l'ordre ne change jamais</li>
                      <li>RCP : comprimer le torse pour faire circuler sang et air</li>
                      <li>Gestion des hémorragies et des brûlures</li>
                    </ul>
                    """)
    );

    private static final List<LessonSpec> MODULE_13_LESSONS = List.of(
            new LessonSpec("Le marketing mix appliqué au tourisme", """
                    <h1>Marketing mix touristique</h1>
                    <p>Les 4P structurent l'offre : <strong>Produit</strong>, <strong>Prix</strong>, <strong>Distribution</strong>, <strong>Promotion</strong>.</p>
                    <p>Appliqués au tourisme : politique produit (l'offre), modèle économique, canaux de commercialisation, communication on/off line.</p>
                    """),
            new LessonSpec("Construire une offre attractive", """
                    <h1>Construire une offre</h1>
                    <ol>
                      <li>Analyser le marché et la concurrence</li>
                      <li>Définir une proposition de valeur unique</li>
                      <li>Choisir les canaux pertinents (agences, en ligne, réseaux)</li>
                    </ol>
                    """)
    );

    private static final List<LessonSpec> MODULE_14_LESSONS = List.of(
            new LessonSpec("Convention collective du transport aérien", """
                    <h1>Convention collective</h1>
                    <p>Elle adapte le Code du travail à la branche transport aérien, négociée entre syndicats de salariés et d'employeurs.</p>
                    <p>Elle couvre salaire, congés, temps de travail, maladie, licenciement, retraite — toujours dans un sens plus favorable que le droit commun.</p>
                    """),
            new LessonSpec("Droits et obligations du PNC", """
                    <h1>Droits et obligations</h1>
                    <ul>
                      <li>Temps de vol et temps de repos réglementés (fatigue, sécurité)</li>
                      <li>Obligations de formation continue et de sécurité</li>
                      <li>Droits sociaux : congés, protection sociale, évolution de carrière</li>
                    </ul>
                    """)
    );

    private static final List<LessonSpec> MODULE_15_LESSONS = List.of(
            new LessonSpec("Le poids économique du tourisme", """
                    <h1>Poids économique</h1>
                    <p>Le tourisme est un des principaux secteurs économiques mondiaux : emploi, devises, développement local.</p>
                    <p>Le secteur reste toutefois sensible aux chocs géopolitiques et économiques, qui peuvent faire varier fortement les flux d'une année à l'autre.</p>
                    """),
            new LessonSpec("Tourisme et société", """
                    <h1>Impacts sociétaux</h1>
                    <ul>
                      <li>Effets positifs : emploi local, échanges culturels, infrastructures</li>
                      <li>Effets à surveiller : pression sur les ressources, saisonnalité, acceptabilité locale</li>
                    </ul>
                    <p>Un développement touristique durable cherche l'équilibre entre ces deux faces.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_16_LESSONS = List.of(
            new LessonSpec("Les grandes régions touristiques du Maroc", """
                    <h1>Régions touristiques du Maroc</h1>
                    <p>Le pays s'organise autour de grands ensembles : littoral (Rabat, Casablanca, El Jadida, Essaouira, Agadir), Rif, Atlas et Sahara.</p>
                    <p>Chaque région porte une offre distincte : balnéaire, montagne/trekking, désert, patrimoine culturel.</p>
                    """),
            new LessonSpec("Villes impériales et routes touristiques", """
                    <h1>Villes impériales</h1>
                    <ul>
                      <li><strong>Marrakech</strong> — souk, place Jemaa el-Fna, palais et jardins</li>
                      <li><strong>Fès</strong> — médina labyrinthique, tanneries, mosquée Al-Qarawiyyin</li>
                      <li><strong>Meknès</strong> — Bab Mansour, palais royal</li>
                      <li><strong>Ouarzazate</strong> — porte du désert, kasbahs, tournages de cinéma</li>
                    </ul>
                    """)
    );

    private static final List<LessonSpec> MODULE_17_LESSONS = List.of(
            new LessonSpec("Préparer son stage", """
                    <h1>Préparer son stage</h1>
                    <ul>
                      <li>Clarifier la mission et les objectifs avec le tuteur</li>
                      <li>Identifier les documents requis (convention, assurance)</li>
                      <li>Se renseigner sur l'entreprise avant le premier jour</li>
                    </ul>
                    """),
            new LessonSpec("Journal de bord et posture en entreprise", """
                    <h1>Journal de bord</h1>
                    <p>Prendre des notes chaque jour : missions confiées, difficultés, réussites — la matière première du futur rapport.</p>
                    <p>Ponctualité, discrétion, initiative mesurée : les mêmes fondamentaux que ceux vus en posture professionnelle s'appliquent en entreprise.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_18_LESSONS = List.of(
            new LessonSpec("Structurer son rapport de stage", """
                    <h1>Structurer le rapport</h1>
                    <p>Un rapport de stage permet à l'évaluateur de comprendre les missions et le contexte de votre stage.</p>
                    <p>Jalons clés : détermination du thème, formulation de la problématique, plan, rédaction.</p>
                    """),
            new LessonSpec("Introduction, développement, conclusion", """
                    <h1>Plan type</h1>
                    <ul>
                      <li><strong>Introduction</strong> — présentation de l'entreprise (historique, activité) et de la mission confiée</li>
                      <li><strong>Développement</strong> — le cœur du rapport : missions, méthodes, résultats</li>
                      <li><strong>Conclusion</strong> — bilan des compétences acquises et perspectives</li>
                    </ul>
                    """)
    );

    private static final List<QuestionSpec> QUIZ_COM = List.of(
            new QuestionSpec(
                    "La reformulation sert surtout à :",
                    QuestionType.SINGLE_CHOICE,
                    "Vérifier la compréhension mutuelle.",
                    List.of(
                            new OptionSpec("Accélérer l'embarquement uniquement", false),
                            new OptionSpec("Vérifier qu'on a bien compris le besoin", true),
                            new OptionSpec("Remplacer le briefing équipage", false)
                    )),
            new QuestionSpec(
                    "Un briefing oral efficace contient un timing clair.",
                    QuestionType.TRUE_FALSE,
                    "Oui — le T de START inclut le timing.",
                    List.of(new OptionSpec("Vrai", true), new OptionSpec("Faux", false)))
    );

    private static final List<QuestionSpec> QUIZ_FR = List.of(
            new QuestionSpec(
                    "Quelle formule est la plus professionnelle ?",
                    QuestionType.SINGLE_CHOICE,
                    "Politesse + précision.",
                    List.of(
                            new OptionSpec("Attends je regarde", false),
                            new OptionSpec("Je vérifie immédiatement et je reviens vers vous", true),
                            new OptionSpec("C'est pas mon service", false)
                    )),
            new QuestionSpec(
                    "Quels éléments appartiennent à une annonce claire ? (plusieurs)",
                    QuestionType.MULTI_CHOICE,
                    "Qui / quoi / où / quand.",
                    List.of(
                            new OptionSpec("Identification du vol", true),
                            new OptionSpec("Information floue sans action", false),
                            new OptionSpec("Prochaine étape pour le passager", true),
                            new OptionSpec("Blague hors contexte", false)
                    ))
    );

    private static final List<QuestionSpec> QUIZ_EN = List.of(
            new QuestionSpec(
                    "\"Boarding\" means :",
                    QuestionType.SINGLE_CHOICE,
                    "Embarquement des passagers.",
                    List.of(
                            new OptionSpec("Luggage claim", false),
                            new OptionSpec("Passenger embarkation", true),
                            new OptionSpec("Aircraft refuel only", false)
                    )),
            new QuestionSpec(
                    "\"Connecting flight\" désigne une correspondance.",
                    QuestionType.TRUE_FALSE,
                    "Correct.",
                    List.of(new OptionSpec("True", true), new OptionSpec("False", false)))
    );

    private static final List<QuestionSpec> QUIZ_ATTITUDE = List.of(
            new QuestionSpec(
                    "Face à un passager irrité, la première priorité est :",
                    QuestionType.SINGLE_CHOICE,
                    "Sécuriser le dialogue puis traiter le besoin.",
                    List.of(
                            new OptionSpec("Hausser le ton", false),
                            new OptionSpec("Écouter puis reformuler calmement", true),
                            new OptionSpec("Ignorer et passer au suivant", false)
                    ))
    );
}
