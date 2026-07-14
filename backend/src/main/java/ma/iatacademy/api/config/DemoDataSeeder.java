package ma.iatacademy.api.config;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.iatacademy.api.domain.entity.*;
import ma.iatacademy.api.domain.enums.*;
import ma.iatacademy.api.repository.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Seeds realistic demo content (modules titles, lessons, TipTap HTML, quizzes, progress).
 * Idempotent via marker lesson "Bienvenue à IAT Academy".
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private static final UUID FORMATION_ID =
            UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static final String DEMO_MARKER = "Bienvenue à IAT Academy";

    private static final String[][] MODULES = {
            {"Introduction à l'aviation civile", "Panorama du transport aérien, acteurs et vocabulaire de base."},
            {"Sûreté aéroportuaire", "Contrôles d'accès, screening et procédures de sûreté."},
            {"Réglementation ICAO & IATA", "Cadre normatif international et obligations opérationnelles."},
            {"Accueil et parcours passager", "Parcours client : check-in, embouteillage, embarquement."},
            {"Gestion des bagages", "Traçabilité, livraison, bagages spéciaux et litiges."},
            {"Opérations au sol (Ground Ops)", "Coordination piste, handling et turnaround."},
            {"Sécurité incendie & évacuation", "Risques incendie, équipements et exercices."},
            {"Premiers secours aéroportuaires", "Gestes d'urgence et chaîne d'alerte."},
            {"Communication radio et phraseologie", "Échanges sol–air et discipline radio."},
            {"Fret et cargo aérien", "Documents, dangereuses goods et flux cargo."},
            {"Documents de voyage", "Passeports, visas, contrôles frontière."},
            {"Contrôle d'accès zones réservées", "Badges, escortes et zones sterile."},
            {"Gestion des situations d'urgence", "Plans d'urgence et rôles du personnel."},
            {"Qualité de service aéroportuaire", "Standards de service et mesure de la satisfaction."},
            {"Soft skills & orientation client", "Communication, stress et relation passager."},
            {"Anglais professionnel aéroport", "Phrases clés check-in, boarding et handling."},
            {"Systèmes d'information aéroportuaire", "DCS, FIDS et outils collaboratifs."},
            {"RSE et responsabilité professionnelle", "Éthique, conformité et environnement."},
            {"Mise en situation pratique", "Cas pratiques transverses de la formation."},
            {"Préparation à la certification", "Révisions, quiz final et attestation IAT Academy."}
    };

    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final LessonBlockRepository lessonBlockRepository;
    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureStaffUsers();
        ensureExtraLearners();

        List<ModuleEntity> modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(FORMATION_ID);
        if (modules.isEmpty()) {
            log.warn("No modules found — skip demo content seed.");
            return;
        }

        renameModules(modules);

        boolean demoReady = lessonRepository.findAll().stream()
                .anyMatch(l -> DEMO_MARKER.equals(l.getTitle()));
        if (demoReady) {
            log.info("Demo content marker found — skipping reseed.");
            return;
        }

        log.warn("Clearing existing catalog content then seeding demo data…");
        clearCatalogContent();

        // refresh modules after clear
        modules = moduleRepository.findByFormationIdOrderByOrderIndexAsc(FORMATION_ID);

        seedModuleRich(modules.get(0), MODULE_1_LESSONS);
        seedModuleRich(modules.get(1), MODULE_2_LESSONS);
        seedModuleRich(modules.get(2), MODULE_3_LESSONS);
        seedModuleLight(modules.get(3), List.of("Parcours passager type", "Points de contact", "Gestion des files d'attente"));
        seedModuleLight(modules.get(4), List.of("Chaîne bagages", "Tags et tracking", "Réclamations"));

        seedFinModuleQuiz(modules.get(0), "Quiz — Introduction aviation", QUIZ_1);
        seedFinModuleQuiz(modules.get(1), "Quiz — Sûreté aéroportuaire", QUIZ_2);

        seedDemoProgress(modules);
        log.warn("Demo content ready. Login: apprenant@iat-academy.local / Apprenant@123");
    }

    private void clearCatalogContent() {
        entityManager.createQuery("DELETE FROM LessonProgress").executeUpdate();
        entityManager.createQuery("DELETE FROM QuizAttempt").executeUpdate();
        entityManager.createQuery("DELETE FROM AnswerOption").executeUpdate();
        entityManager.createQuery("DELETE FROM Question").executeUpdate();
        entityManager.createQuery("DELETE FROM Quiz").executeUpdate();
        entityManager.createQuery("DELETE FROM LessonBlock").executeUpdate();
        entityManager.createQuery("DELETE FROM Lesson").executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }

    private void ensureStaffUsers() {
        createUserIfAbsent("formateur@iat-academy.local", "Formateur@123", "Sara Formateur", Role.FORMATEUR);
    }

    private void ensureExtraLearners() {
        createUserIfAbsent("amina.benali@demo.local", "Demo@1234", "Amina Benali", Role.ETUDIANT);
        createUserIfAbsent("youssef.idrissi@demo.local", "Demo@1234", "Youssef Idrissi", Role.ETUDIANT);
        createUserIfAbsent("lina.cherkaoui@demo.local", "Demo@1234", "Lina Cherkaoui", Role.ETUDIANT);
    }

    private void createUserIfAbsent(String email, String password, String fullName, Role role) {
        if (userRepository.existsByEmailIgnoreCase(email)) return;
        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .build());
        log.warn("Demo user created: {} / {} ({})", email, password, role);
    }

    private void renameModules(List<ModuleEntity> modules) {
        for (int i = 0; i < modules.size() && i < MODULES.length; i++) {
            ModuleEntity m = modules.get(i);
            m.setTitle(MODULES[i][0]);
            m.setDescription(MODULES[i][1]);
            m.setPublished(true);
        }
        moduleRepository.saveAll(modules);
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
                                    + "<p>Contenu de démonstration pour <strong>" + module.getTitle()
                                    + "</strong>. Utilisez l'éditeur TipTap admin pour enrichir cette section.</p>"
                                    + "<ul><li>Objectif pédagogique</li><li>Points clés</li><li>Quiz associé au module</li></ul>"))
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
                AnswerOption ao = AnswerOption.builder()
                        .question(q)
                        .label(opt.label())
                        .correct(opt.correct())
                        .orderIndex(oi++)
                        .build();
                q.getOptions().add(ao);
            }
            quiz.getQuestions().add(q);
        }
        quizRepository.save(quiz);
    }

    private void seedDemoProgress(List<ModuleEntity> modules) {
        User demo = userRepository.findByEmailIgnoreCase("apprenant@iat-academy.local").orElse(null);
        User amina = userRepository.findByEmailIgnoreCase("amina.benali@demo.local").orElse(null);
        User youssef = userRepository.findByEmailIgnoreCase("youssef.idrissi@demo.local").orElse(null);
        if (demo == null || modules.isEmpty()) return;

        List<Lesson> m1 = lessonRepository.findByModuleIdOrderByOrderIndexAsc(modules.get(0).getId());
        List<Lesson> m2 = lessonRepository.findByModuleIdOrderByOrderIndexAsc(modules.get(1).getId());

        for (int i = 0; i < Math.min(2, m1.size()); i++) {
            completeLesson(demo, m1.get(i));
        }

        if (amina != null) {
            m1.forEach(l -> completeLesson(amina, l));
            for (int i = 0; i < Math.min(2, m2.size()); i++) {
                completeLesson(amina, m2.get(i));
            }
        }

        if (youssef != null && !m1.isEmpty()) {
            completeLesson(youssef, m1.get(0));
        }
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
                .completedAt(Instant.now())
                .build());
    }

    private record LessonSpec(String title, String html) {}
    private record OptionSpec(String label, boolean correct) {}
    private record QuestionSpec(String prompt, QuestionType type, String explanation, List<OptionSpec> options) {}

    private static final List<LessonSpec> MODULE_1_LESSONS = List.of(
            new LessonSpec(DEMO_MARKER, """
                    <h1>Bienvenue à IAT Academy</h1>
                    <p>Cette formation vous prépare aux métiers de l'<strong>aéroportuaire</strong> et du transport aérien.</p>
                    <h2>Objectifs du parcours</h2>
                    <ul>
                      <li>Comprendre l'écosystème aviation civile</li>
                      <li>Maîtriser la sûreté et la réglementation</li>
                      <li>Valider 20 modules + attestation PDF</li>
                    </ul>
                    <blockquote>Conseil : utilisez la barre latérale pour naviguer entre les sections, comme sur Coursera.</blockquote>
                    """),
            new LessonSpec("Acteurs du transport aérien", """
                    <h1>Les acteurs du transport aérien</h1>
                    <p>Le système aéronautique repose sur plusieurs parties prenantes.</p>
                    <h2>Principaux acteurs</h2>
                    <ol>
                      <li><strong>ICAO</strong> — normes internationales</li>
                      <li><strong>IATA</strong> — compagnies aériennes</li>
                      <li><strong>Aéroports</strong> — exploitation des infrastructures</li>
                      <li><strong>Handlers</strong> — assistance en escale</li>
                    </ol>
                    <h3>À retenir</h3>
                    <p>Chaque acteur a des responsabilités complémentaires pour la sécurité et la qualité de service.</p>
                    """),
            new LessonSpec("Vocabulaire opérationnel", """
                    <h1>Vocabulaire opérationnel</h1>
                    <p>Familiarisez-vous avec les termes utilisés quotidiennement.</p>
                    <ul>
                      <li><strong>Turnaround</strong> — rotation avion au sol</li>
                      <li><strong>Gate</strong> — porte d'embarquement</li>
                      <li><strong>Stand</strong> — poste de stationnement</li>
                      <li><strong>FOD</strong> — debris dangereux en piste</li>
                    </ul>
                    <p><em>Exercice :</em> notez 5 termes nouveaux et leur définition.</p>
                    """),
            new LessonSpec("Organisation d'un aéroport", """
                    <h1>Organisation d'un aéroport</h1>
                    <h2>Zones principales</h2>
                    <ul>
                      <li>Terminal passagers (landside / airside)</li>
                      <li>Piste et taxiways</li>
                      <li>Zone fret</li>
                      <li>Installations techniques</li>
                    </ul>
                    <p>La cloison <u>landside / airside</u> est critique pour la sûreté.</p>
                    """)
    );

    private static final List<LessonSpec> MODULE_2_LESSONS = List.of(
            new LessonSpec("Principes de sûreté", """
                    <h1>Principes de sûreté aéroportuaire</h1>
                    <p>La sûreté vise à prévenir les actes d'<strong>intervention illicite</strong>.</p>
                    <h2>Piliers</h2>
                    <ul><li>Prévention</li><li>Détection</li><li>Réponse</li></ul>
                    """),
            new LessonSpec("Contrôles et screening", """
                    <h1>Contrôles et screening</h1>
                    <p>Flux passagers, bagages de cabine et de soute.</p>
                    <ol>
                      <li>Contrôle documentaire</li>
                      <li>Inspection filtrage</li>
                      <li>Contrôles aléatoires renforcés</li>
                    </ol>
                    """),
            new LessonSpec("Badges et accès", """
                    <h1>Badges et accès zones réservées</h1>
                    <p>Le contrôle d'accès repose sur l'autorisation, l'identification et la traçabilité.</p>
                    <blockquote>Ne jamais prêter son badge — règle d'or.</blockquote>
                    """)
    );

    private static final List<LessonSpec> MODULE_3_LESSONS = List.of(
            new LessonSpec("Cadre ICAO", """
                    <h1>Cadre ICAO</h1>
                    <p>Les <strong>Annexes</strong> ICAO structurent les standards de sécurité et sûreté.</p>
                    """),
            new LessonSpec("Standards IATA", """
                    <h1>Standards IATA</h1>
                    <p>Les résolutions et manuels IATA guident les opérations des compagnies.</p>
                    """),
            new LessonSpec("Conformité locale", """
                    <h1>Conformité locale</h1>
                    <p>Chaque État transpose les standards internationaux dans sa réglementation nationale.</p>
                    """)
    );

    private static final List<QuestionSpec> QUIZ_1 = List.of(
            new QuestionSpec(
                    "Que signifie ICAO ?",
                    QuestionType.SINGLE_CHOICE,
                    "International Civil Aviation Organization.",
                    List.of(
                            new OptionSpec("International Civil Aviation Organization", true),
                            new OptionSpec("International Cargo Airline Office", false),
                            new OptionSpec("Internal Cabin Attendant Organization", false)
                    )),
            new QuestionSpec(
                    "Landside et airside désignent :",
                    QuestionType.SINGLE_CHOICE,
                    "Deux zones séparées par le contrôle de sûreté.",
                    List.of(
                            new OptionSpec("Deux compagnies concurrentes", false),
                            new OptionSpec("Zones publiques vs zones contrôlées après sûreté", true),
                            new OptionSpec("Deux types d'appareils", false)
                    )),
            new QuestionSpec(
                    "Le turnaround concerne la rotation avion au sol.",
                    QuestionType.TRUE_FALSE,
                    "Oui, c'est le temps entre l'arrivée et le prochain départ.",
                    List.of(
                            new OptionSpec("Vrai", true),
                            new OptionSpec("Faux", false)
                    ))
    );

    private static final List<QuestionSpec> QUIZ_2 = List.of(
            new QuestionSpec(
                    "La sûreté aéroportuaire vise principalement à :",
                    QuestionType.SINGLE_CHOICE,
                    "Prévenir les actes d'intervention illicite.",
                    List.of(
                            new OptionSpec("Augmenter les retards", false),
                            new OptionSpec("Prévenir les actes illicites", true),
                            new OptionSpec("Remplacer la maintenance", false)
                    )),
            new QuestionSpec(
                    "Quelles sont des bonnes pratiques d'accès ? (plusieurs réponses)",
                    QuestionType.MULTI_CHOICE,
                    "Badge personnel + ne jamais prêter + signaler anomalies.",
                    List.of(
                            new OptionSpec("Porter son propre badge", true),
                            new OptionSpec("Prêter son badge à un collègue", false),
                            new OptionSpec("Signaler un accès anormal", true),
                            new OptionSpec("Laisser une porte ouverte pour gagner du temps", false)
                    ))
    );
}
