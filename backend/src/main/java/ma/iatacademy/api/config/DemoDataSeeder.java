package ma.iatacademy.api.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.*;
import ma.iatacademy.api.domain.enums.*;
import ma.iatacademy.api.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    private static final UUID FORMATION_ID =
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    /** Changing this forces a one-shot catalog reseed on next boot. */
    private static final String DEMO_MARKER = "Embarquement IAT Academy";

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

    @Value("${app.demo.reset-progress-on-startup:true}")
    private boolean resetProgressOnStartup;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureStaffUsers();
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
        }

        log.warn("""
                Demo ready — scénarios:
                  apprenant@iat-academy.local / Apprenant@123  → UF1 en cours (module 1 validé)
                  amina.benali@demo.local / Demo@1234          → UF1 terminée, UF2 démarrée
                  youssef.idrissi@demo.local / Demo@1234       → débutant (1 section)
                  lina.cherkaoui@demo.local / Demo@1234        → zéro progression
                  salma.naji@demo.local / Demo@1234            → année 2 ouverte
                  karim.ouafi@demo.local / Demo@1234           → paiement / activation en attente
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
        seedModuleLight(modules.get(3), List.of(
                "Posture professionnelle", "Communication non verbale", "Gestion du stress client"));

        if (modules.size() > 4) {
            seedModuleLight(modules.get(4), List.of(
                    "Ice-breakers aéroport", "Animation de groupe", "Briefing équipage"));
        }
        if (modules.size() > 5) {
            seedModuleLight(modules.get(5), List.of(
                    "Accueil landside", "File d'attente", "Réclamations passagers"));
        }
        if (modules.size() > 6) {
            seedModuleLight(modules.get(6), List.of(
                    "Flux aéroportuaires", "Correspondances", "Gestion des retards"));
        }
        if (modules.size() > 7) {
            seedModuleLight(modules.get(7), List.of(
                    "GDS découverte", "Devis voyage", "Upsell services"));
        }

        // Remaining année 1 modules (UF3–UF5) get light demo sections
        for (int i = 8; i < Math.min(18, modules.size()); i++) {
            ModuleEntity mod = modules.get(i);
            seedModuleLight(mod, List.of(
                    mod.getTitle() + " — intro démo", "Points clés", "Synthèse"));
        }

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
    }

    private void upsertLearner(
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
        userRepository.save(user);
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

    private void seedModuleLight(ModuleEntity module, List<String> titles) {
        int order = 0;
        for (String title : titles) {
            Lesson lesson = lessonRepository.save(Lesson.builder()
                    .module(module)
                    .title(title)
                    .orderIndex(order++)
                    .published(true)
                    .build());
            lessonBlockRepository.save(LessonBlock.builder()
                    .lesson(lesson)
                    .blockType(BlockType.TEXT)
                    .orderIndex(0)
                    .content(Map.of("body",
                            "<h2>" + title + "</h2>"
                                    + "<p>Contenu démo pour <strong>" + module.getTitle()
                                    + "</strong> (" + module.getCode() + ").</p>"
                                    + "<ul><li>Objectif pédagogique</li><li>Cas pratique</li>"
                                    + "<li>Points de contrôle</li></ul>"))
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
                .retryDelayHours(1)
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
