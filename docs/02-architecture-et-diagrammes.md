# Architecture et diagrammes — IAT Academy

Ce document présente l'architecture technique d'IAT Academy puis détaille, un par un, les onze diagrammes réellement présents dans le dépôt (`diagrammes/*.puml` et `diagrammes/mingrammer/*.py`). Pour chacun, le contenu est confronté au code source actuel (entités JPA, services, contrôleurs, configuration) afin que le jury puisse vérifier lui-même la correspondance diagramme ↔ implémentation.

Toutes les affirmations ci-dessous ont été vérifiées par lecture directe des fichiers cités (pas de génération à partir de mémoire ou de suppositions).

### Inventaire des onze diagrammes du dépôt

| # | Type | Fichier source | Rendu |
|---|------|-----------------|-------|
| 1 | Cas d'utilisation | `diagrammes/diagramme_cas_utilisation.puml` | PlantUML |
| 2 | Classes — vue d'ensemble | `diagrammes/diagramme_classes_ensemble.puml` | PlantUML |
| 3 | Classes — pédagogie | `diagrammes/diagramme_classes_pedagogie.puml` | PlantUML |
| 4 | Classes — évaluation | `diagrammes/diagramme_classes_evaluation.puml` | PlantUML |
| 5 | Classes — stage & certification | `diagrammes/diagramme_classes_stage_certification.puml` | PlantUML |
| 6 | Séquence — génération IA | `diagrammes/diagramme_sequence_generation_questions_ia.puml` | PlantUML |
| 7 | Séquence — correction hybride | `diagrammes/diagramme_sequence_correction_quiz_hybride.puml` | PlantUML |
| 8 | Séquence — progression UF/certificat | `diagrammes/diagramme_sequence_progression_uf_certificat.puml` | PlantUML |
| 9 | Séquence — contrôle d'accès propriétaire | `diagrammes/diagramme_sequence_controle_acces_proprietaire.puml` | PlantUML |
| 10 | Architecture en couches | `diagrammes/mingrammer/diagramme_architecture.py` | Python (mingrammer/`diagrams`) |
| 11 | Déploiement | `diagrammes/mingrammer/diagramme_deploiement.py` | Python (mingrammer/`diagrams`) |

Ce recensement correspond exactement au contenu actuel de `diagrammes/` : aucun diagramme de packages, d'activité ou de composants distinct n'a été trouvé dans le dépôt — seuls ces onze fichiers existent, et c'est aussi ce que documente ce fichier, sans en ajouter ni en omettre.

---

## 1. Vue d'ensemble de l'architecture

IAT Academy suit une architecture classique en trois couches :

```
Navigateur (Next.js 15, App Router, TypeScript)
        │  HTTPS + cookie JWT httpOnly
        ▼
Reverse proxy Nginx (deploy/nginx/conf.d/elearning.conf)
        │  / → frontend:3000      /api/, /swagger-ui/, /api-docs → api:8080
        ▼
API REST Spring Boot 3.4.5 (Java 17 — voir backend/pom.xml, <java.version>17</java.version>)
   Contrôleurs → Services → Repositories (Spring Data JPA)
        │                              │
        ▼                              ▼
   PostgreSQL 16 (migrations Flyway)   Redis 7 (rate-limit, verrous de tentative, sessions quiz)
```

**Contrôleurs REST.** Le dépôt contient exactement **31 fichiers `@RestController`** dans `backend/src/main/java/ma/iatacademy/api/controller/` (compte vérifié par listage direct du dossier) : `AdminController`, `AgendaController`, `AnalyticsController`, `AssetController`, `AssignmentController`, `AuthController`, `BadgeController`, `CertificateController`, `CommentController`, `CourseAssistantController`, `EmailCampaignController`, `FormationController`, `GradebookController`, `GroupController`, `JobOfferController`, `LearnerGradebookController`, `LessonController`, `LessonNoteController`, `MediaFolderController`, `MessagingController`, `ModuleController`, `NotificationController`, `ProgressController`, `PublicBadgeController`, `PublicLeadController`, `PublicStageSignoffController`, `QuizController`, `SearchController`, `StageController`, `ThemeController`, `VirtualSessionController`. Ce nombre (31) est celui qu'affiche littéralement le diagramme d'architecture (`diagrammes/mingrammer/diagramme_architecture.py`, nœud `Spring("Contrôleurs REST\n(31 @RestController)")`) — la valeur codée en dur dans le script est donc à jour.

**Reverse proxy Nginx.** Le fichier `deploy/nginx/conf.d/elearning.conf` existe bien et définit deux upstreams (`iat_api` → `api:8080`, `iat_frontend` → `frontend:3000`), avec un routage `/` vers le frontend, `/api/`, `/swagger-ui/` et `/api-docs` vers l'API, et un emplacement `internal` pour `/internal-media/` (servir les médias sans exposer le chemin disque). Ce fichier de configuration est écrit et versionné, mais — point important vérifié dans `docker-compose.yml` — **le conteneur Nginx n'est pas encore activé** : `docker-compose.yml` ne démarre aujourd'hui que `postgres` et `redis` ; le bloc `api` (build `./backend`) est présent mais entièrement commenté avec la note *"API & frontend services will be enabled in a later step (Dockerfiles ready in deploy/)"*, et il n'existe aucun bloc `nginx` ni `frontend` dans ce fichier. Le diagramme de déploiement mingrammer reflète cela fidèlement : son titre est explicitement *"architecture cible"* et le cluster Docker Compose est légendé *"postgres + redis actifs aujourd'hui — api/frontend/nginx cibles"*. En développement, l'API et le frontend tournent donc directement via `spring-boot:run` / `npm run dev`, hors conteneurs.

**Backend.** Spring Boot 3.4.5 (`spring-boot-starter-parent` version 3.4.5 dans `backend/pom.xml`), propriété `java.version` = 17. Dépendances notables : `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-data-redis`, `spring-boot-starter-mail`, `flyway-core` + `flyway-database-postgresql`, `jjwt-*` (JWT), `springdoc-openapi-starter-webmvc-ui` (Swagger), `openpdf` (génération de certificats PDF), `poi-ooxml` et `pdfbox` (traitement de documents/miniatures).

**Frontend.** Next.js 15.5 (`"next": "^15.5.22"`, `frontend/package.json`), React 19.1, TypeScript strict, Tailwind v4, `axios` pour le client API, `zod` + `react-hook-form` pour les formulaires, `@tiptap/*` pour l'éditeur de texte riche des leçons, `hls.js` pour le streaming vidéo, `recharts` pour les tableaux de bord analytiques, `vitest` + Testing Library pour les tests unitaires, `@playwright/test` pour les tests e2e.

**Données.** PostgreSQL 16 (`postgres:16-alpine` dans `docker-compose.yml`), schéma géré par migrations Flyway séquentielles (`backend/src/main/resources/db/migration/V<N>__description.sql`). Redis 7 (`redis:7-alpine`) sert exclusivement de magasin technique : limitation de débit (`RateLimitService`), verrou de démarrage de tentative de quiz (`QuizAttemptRepository#acquireStartLock`), sessions de tentative/aperçu de quiz (clés `quiz_attempt:*`, `quiz_preview:*`).

**Intégrations externes.** Gemini (primaire) et Grok (repli) pour la génération de questions par IA et l'assistant de cours (`AiProviderProperties`, `QuestionGenerationService`, `CourseAssistantService`) ; Bunny Stream pour l'hébergement et le streaming vidéo (`BunnyStreamClient`) ; un serveur SMTP pour les campagnes email et les notifications (`EmailService`).

---

## 2. Diagramme de cas d'utilisation

**Fichier source :** `diagrammes/diagramme_cas_utilisation.puml`.

### Objectif

Donner une vue synthétique, orientée métier, des interactions possibles entre les différents profils d'utilisateurs et le système IAT Academy — utile en ouverture de rapport pour poser le périmètre fonctionnel sans entrer dans le détail technique.

### Éléments représentés

- **Acteurs** : `Visiteur`, `Utilisateur Connecté` (`User`), `Étudiant`, `Formateur`, `Admin (Directeur)`, `Super Admin`, `Support`. Une hiérarchie d'acteurs est modélisée par généralisation UML (flèches `--|>`) : `Étudiant --|> User`, `Formateur --|> User`, `Admin --|> Formateur`, `SuperAdmin --|> Admin`. `Support --|> User` est représenté **séparément** de cette chaîne (pas `Support --|> Formateur`) — cohérent avec `Role.isStaff()` qui exclut explicitement `SUPPORT`.
- **Cas d'utilisation**, regroupés visuellement en cinq blocs : accès et compte (inscription, authentification 2FA, espace personnel, profil, contact, vérification de certificat), cours et évaluations (consultation, passage de quiz, résultats, conception de quiz, génération IA, notation), stage et certification (dossier de stage, validation d'UF, certificat, invitation tuteur, partage de réussite), administration et services (messagerie, gestion des utilisateurs/cohortes, journaux d'audit, paramètres, bourse à l'emploi, **assistance support en lecture seule**).
- **Relations** : associations acteur → cas d'utilisation par acteur ; deux relations `<<include>>`/`<<extend>>` entre cas (`AccessSpace` inclut `Login`, `AiGenerate` étend `ManageQuiz`, `InviteSignoff` étend `ValidateUf`).

### Correspondance avec l'implémentation

- L'authentification 2FA (`UC_Login`) correspond au champ `totpEnabled`/`totpSecret` de l'entité `User` (`backend/.../domain/entity/User.java`) et à `AuthController`/`AuthService`.
- « Générer des questions par IA » (`UC_AiGenerate`) correspond exactement à `QuestionGenerationService` et à l'endpoint `POST /quiz/{id}/questions/generate-ai` (voir §4.1) — la relation `<<extend>>` vers `ManageQuiz` traduit bien le fait que la génération IA est une option du flux de création de quiz, jamais un chemin autonome.
- « Valider une unité de formation (UF) » (`UC_ValidateUf`) correspond à `UfValidationService#validate`, réservé aux rôles staff (`principal.getRole().isStaff()`), et « Inviter le tuteur à signer » (`UC_InviteSignoff`) à `StageSignoffService`/`StageSignoffInvite` — la relation `<<extend>>` reflète que l'invitation de signature est une extension du parcours de validation d'UF, pas un cas indépendant.
- « Consulter la bourse à l'emploi » (`UC_JobsView`) correspond à `JobOfferService`, dont l'accès est réservé aux diplômés via `certificateRepository.findByUserIdAndFormationId(...)` (voir §1 et le diagramme de classes d'ensemble, relation `JobOffer ..> Certificate`).

### Choix de modélisation à noter

- La hiérarchie d'acteurs par généralisation UML (`Étudiant --|> User`, etc.) est une **convention de modélisation**, pas le reflet direct du code : `Role` (`backend/.../domain/enums/Role.java`) est un `enum` **plat** à cinq valeurs (`SUPER_ADMIN, ADMIN, FORMATEUR, ETUDIANT, SUPPORT`) — un enum Java ne peut pas hériter d'un autre. La logique de permission est portée par la méthode `Role.isStaff()` (`SUPER_ADMIN`, `ADMIN`, `FORMATEUR`), pas par un arbre de classes. Le diagramme reste un résumé fidèle de l'inclusion des permissions (un Formateur peut tout ce qu'un Étudiant peut, etc.), mais le jury doit comprendre qu'il n'y a pas de hiérarchie de classes `Etudiant extends User` en Java.
- Le rôle `SUPPORT` existe dans le code (`Role.SUPPORT`, utilisé par `MessagingService#isMessagingEligible` et `MessagingService#listSupportContacts`) et apparaît désormais comme acteur dédié (`Support --> UC_Message`, `Support --> UC_SupportAssist`) — *corrigé, voir §6*.

---

## 3. Diagrammes de classes

Quatre diagrammes de classes couvrent le domaine, du plus général (vue d'ensemble) au plus spécifique (un sous-domaine par fichier). Tous partagent la même palette de marque (navy `#142B4B` / gold `#C97612`) et une classe technique commune, `AuditableEntity` (`createdAt`, `updatedAt`), qui correspond exactement à `backend/.../domain/entity/AuditableEntity.java` — une `@MappedSuperclass` Hibernate dont héritent, en Java, toutes les entités auditées via `@PrePersist`/`@PreUpdate`.

### 3.1 Vue d'ensemble simplifiée — `diagramme_classes_ensemble.puml`

**Objectif.** Donner une carte globale du domaine (8 paquetages fonctionnels, 1 à 3 classes représentatives chacun) sans viser l'exhaustivité — c'est le diagramme d'entrée avant les trois diagrammes détaillés.

**Éléments représentés.** Huit paquetages : Utilisateurs & Groupes (`User`, `LearnerGroup`), Contenu pédagogique (`Formation`, `ModuleEntity`, `Lesson`), Évaluation (`Quiz`, `QuizAttempt`), Stage & Certification (`LearnerUfValidation`, `Certificate`), Communication (`Conversation`, `Notification`), Marketing & Emploi (`EmailCampaign`, `JobOffer`), Médias (`Asset`), Système (`AuditLogEntry`). Chaque paquetage est annoté d'un nombre entre parenthèses (ex. « Évaluation (9) ») qui indique le nombre réel de classes du sous-domaine, au-delà des 2-3 représentées.

**Relations principales.** Composition `Formation *-- ModuleEntity *-- Lesson` ; association `User -- LearnerGroup` (0..N vers 0..1) ; `Quiz -- QuizAttempt` ; `JobOffer ..> Certificate : vérifie l'éligibilité`.

**Correspondance avec l'implémentation.** Toutes les classes citées existent telles quelles dans `backend/.../domain/entity/`. La relation la plus intéressante à vérifier était `JobOffer ..> Certificate : vérifie l'éligibilité` : elle est confirmée littéralement dans `JobOfferService.java`, dont le Javadoc de classe précise *« "alumni" n'est pas un champ dédié sur User, c'est dérivé de l'existence d'un Certificate pour la formation »*, et dont une méthode contient `boolean isAlumni = certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID).isPresent();` suivi d'un rejet `ForbiddenException` si `!isAlumni`. Le diagramme documente donc une dépendance de service réelle, pas une simple supposition de cohérence métier.

**Points à retenir pour le jury.**
1. L'UF (unité de formation) n'a pas de table dédiée : elle est représentée par un simple attribut `ufCode` partagé par plusieurs `ModuleEntity` (voir §3.2 et §4.3), pas par une classe séparée dans ce diagramme.
2. Les chiffres entre parenthèses dans les titres de paquetage donnent une mesure honnête de la simplification opérée (ex. 9 classes réelles dans « Évaluation » contre 2 représentées).

### 3.2 Structure pédagogique et groupes — `diagramme_classes_pedagogie.puml`

**Objectif.** Détailler l'arborescence de contenu (formation → module → leçon → bloc) et le mécanisme de cohortes/groupes qui conditionne l'accès à ce contenu.

**Éléments représentés.** Classes `User`, `LearnerGroup`, `GroupContentAssignment`, `Formation`, `ModuleEntity`, `Lesson`, `LessonBlock`, `LessonProgress` ; énumérations `Role` (5 valeurs), `EnrollmentMode` (`EN_LIGNE`, `HYBRIDE`), `BlockType` (`VIDEO`, `TEXT`, `PDF`, `IMAGE`).

**Correspondance avec l'implémentation — vérifiée attribut par attribut :**
- `ModuleEntity` : le diagramme liste `code, title, orderIndex, yearNumber, ufCode, ufTitle, published` — exactement les champs de `backend/.../domain/entity/ModuleEntity.java` (`@Column(name = "uf_code")`, `@Column(name = "uf_title")`, `@Column(name = "year_number")`). **C'est ici que se vérifie le choix d'architecture central : l'UF n'est pas une entité, c'est un attribut `ufCode` (String) porté par `ModuleEntity`.** Plusieurs modules partagent le même `ufCode` pour former une UF logique.
- `GroupContentAssignment` (`ufCode`, `unlockAt`) correspond exactement à l'entité du même nom, avec la relation `GroupContentAssignment --> "1" ModuleEntity` confirmée par le champ `@ManyToOne private ModuleEntity module` — et le commentaire de code *« Renseigné quand l'affectation vient d'une UF entière (traçabilité de l'origine) »* pour son propre `ufCode`.
- `Role` liste bien 5 valeurs dans le code, y compris `SUPPORT` — ici le diagramme de classes, contrairement au diagramme de cas d'utilisation, représente fidèlement les 5 valeurs de l'enum.
- La relation `User "0..N" -- "0..1" LearnerGroup` correspond au champ `@ManyToOne private LearnerGroup group` de `User`, commenté dans le code : *« Groupe présentiel/hybride. Null = apprenant 100% en ligne (…). Non-null = progression pilotée par le directeur »*.

**Points à retenir pour le jury.**
1. Le choix « UF = attribut, pas entité » est confirmé indépendamment dans trois endroits du code : `ModuleEntity#ufCode`, `Quiz#ufCode` (fin d'UF, voir §3.3) et `LearnerUfValidation#ufCode` (voir §3.4) — c'est un `String` libre, sans contrainte de clé étrangère, ce qui simplifie le schéma mais reporte l'intégrité référentielle sur la convention de nommage (`"UF 5"`, `"UF 11"`, etc., voir `UfValidationService.DIRECTOR_GATED_UFS`).
2. Deux mécanismes de déblocage de contenu coexistent et sont mutuellement exclusifs par apprenant : progression séquentielle automatique par UF (apprenants en ligne) vs affectations explicites par cohorte via `GroupContentAssignment` (apprenants hybrides, `learner.getGroup() != null`) — voir `ProgressionService#isModuleAccessible`, détaillé en §4.3.

### 3.3 Évaluation — `diagramme_classes_evaluation.puml`

**Objectif.** Détailler le modèle de quiz (questions à choix et questions ouvertes), les devoirs notés manuellement, et les événements anti-triche.

**Éléments représentés.** `Quiz`, `Question`, `AnswerOption`, `QuizAttempt`, `EssayGrade`, `ProctoringEvent`, `Assignment`, `Submission`, `GradeAdjustment` ; énumérations `QuizType` (`APPLICATIF, FIN_MODULE, FIN_UF, FIN_ANNEE`), `QuestionType` (`SINGLE_CHOICE, MULTI_CHOICE, TRUE_FALSE, ESSAY`), `AttemptStatus` (6 valeurs dont `PENDING_REVIEW`), `ProctoringEventType`, `SubmissionStatus`.

**Correspondance avec l'implémentation.** Les quatre énumérations sont recopiées à l'identique de `backend/.../domain/enums/QuizType.java` et `QuestionType.java` (vérification directe des fichiers) — aucun écart. Les attributs de `Quiz` dans le diagramme (`quizType, questionMode, passingScore, maxAttempts, timeLimitSeconds, retryDelayMinutes, blocking`) sont un sous-ensemble réel des champs de l'entité (qui en compte davantage : `randomizeQuestions`, `randomizeOptions`, `proctoringEnabled`, `focusLossDetection`, `copyProtection`, `lockdownMode` — omis pour lisibilité, cohérent avec l'esprit « diagramme de classes », pas « schéma de base »).

**Points à retenir pour le jury.**
1. Un `Quiz` peut être rattaché à une leçon (quiz de section), un module (`FIN_MODULE`), ou porter directement `ufCode`/`yearNumber` (`FIN_UF`/`FIN_ANNEE`) sans FK dédiée — le commentaire du code le justifie explicitement : *« ni une UF ni une année n'a d'autre FK à laquelle s'accrocher »*.
2. Le statut `PENDING_REVIEW` de `AttemptStatus` est la clé de voûte de la correction hybride (§4.2) : une tentative contenant au moins une question `ESSAY` reste dans cet état tant que toutes les questions ouvertes n'ont pas reçu un `EssayGrade`.

### 3.4 Stage, certification et badges — `diagramme_classes_stage_certification.puml`

**Objectif.** Modéliser le parcours de fin de cursus : validation des UF à gate manuel, dossier de stage, certificat final, badges de gamification.

**Éléments représentés.** `LearnerUfValidation`, `StageSignoffInvite`, `LearnerDocument`, `Asset`, `Certificate`, `UserBadge` ; énumérations `BadgeCode` (7 valeurs), `LearnerDocType` (5 valeurs), `LearnerDocStatus` (3 valeurs).

**Correspondance avec l'implémentation.** Tous les attributs et toutes les relations ont été confrontés aux entités réelles :
- `LearnerUfValidation` (`ufCode, validated, validatedAt, note`) + relations `User -- LearnerUfValidation : apprenant >` et `User "0..1" -- "0..N" LearnerUfValidation : validé par >` correspondent exactement aux champs `learner` et `validatedBy` de l'entité.
- `LearnerUfValidation -- "0..N" StageSignoffInvite` correspond au champ `@ManyToOne private LearnerUfValidation ufValidation` de `StageSignoffInvite`.
- `Certificate` (`verificationCode, issuedAt, pdfPath, physicallyDelivered`) correspond à l'entité, à l'exception de deux champs bien réels mais non représentés (`deliveredAt`, `deliveredNote`) — simplification acceptable, sans erreur.
- `UserBadge ..> BadgeCode` et les 7 valeurs de l'enum (`FIRST_MODULE, PERFECT_QUIZ, STAGE_VALIDATED, PROFILE_COMPLETE, FORUM_CONTRIBUTOR, YEAR1_VALIDATED, YEAR2_VALIDATED`) correspondent à `domain/enums/BadgeCode.java` et sont effectivement décernés depuis `BadgeService.awardIfAbsent(...)`, appelé notamment par `ProgressionService.checkAndAwardYearBadges` et `UfValidationService.validate`.

**Points à retenir pour le jury.**
1. Seules deux UF sont soumises à un « gate » de validation manuelle par le Directeur : `UfValidationService.DIRECTOR_GATED_UFS = Set.of("UF 5", "UF 11")` (Stage et Soutenance) — pour toute autre UF, `isValidated(...)` renvoie systématiquement `true` (aucun blocage). Le diagramme ne montre pas cette restriction (il modélise `LearnerUfValidation` comme s'appliquant à toute UF), c'est un détail de règle métier porté par le service, pas par le schéma de données — nuance à clarifier à l'oral.
2. `Asset` (assets/documents) est partagé entre plusieurs usages (média pédagogique, document de stage, avatar) via le champ `ownerId` nullable — *« Null means shared/public (…) Set when the asset becomes a personal document »* — ce qui explique pourquoi `Asset` n'a pas de relation exclusive avec `LearnerDocument` dans le diagramme mais une relation `0..N`.

---

## 4. Diagrammes de séquence

Quatre diagrammes de séquence documentent les flux jugés les plus significatifs pour le jury : un flux d'intégration IA avec repli, un flux de correction en deux temps (auto + manuel), une cascade de règles métier (progression → certificat), et un mécanisme de sécurité transversal (contrôle d'accès fin au-delà du RBAC).

### 4.1 Génération de questions de quiz par IA — `diagramme_sequence_generation_questions_ia.puml`

**Objectif.** Montrer le mécanisme de repli Gemini → Grok et son intégration avec la limitation de débit, pour un cas d'usage IA représentatif de la stack.

**Participants.** `Formateur` (acteur), `QuizController`, `QuestionService`, `RateLimitService`, `QuestionGenerationService`, `Gemini API`, `Grok API`, `PostgreSQL`, `Redis`.

**Correspondance avec l'implémentation — vérifiée ligne par ligne :**
- `QuestionService.generateQuestionsAi(quizId, request, actorId)` existe et appelle bien `rateLimitService.checkAiGenerationAllowed(actorId.toString())` en première ligne, exactement comme représenté.
- `RateLimitService` utilise la clé `"rate:ai-generation:" + userId` avec un seuil `AI_GENERATION_MAX_ATTEMPTS = 20` — le diagramme dit « count > 20 en 5 min », valeur confirmée par la constante (et la fenêtre de 5 minutes correspond à `AI_GENERATION_TTL`, définie dans le même fichier).
- `QuestionGenerationService.generate(sourceText, type, count)` teste bien `properties.getGemini().isConfigured()` en premier ; en cas d'échec (bloc `try/catch` autour de `callGemini`), un `log.warn` puis un essai `callGrok` si `grokConfigured` — le repli Gemini → Grok est réel, pas une supposition.
- `callGemini` et `callGrok` sont bien package-private (non `private`), exactement pour la raison indiquée dans les conventions du projet (« pour que les tests puissent `Mockito.spy()` et stubber l'appel réseau ») — vérifié dans le code source (`String callGemini(String prompt)`, sans modificateur d'accès).
- `parseQuestions` gère bien l'extraction de fences JSON (```json ... ```) via une regex dédiée (`JSON_FENCE`), comme annoté dans le diagramme.

**Points à retenir pour le jury.**
1. `QuestionGenerationService` ne persiste jamais rien lui-même : il renvoie une `List<CreateQuestionRequest>` que `QuestionService` valide et sauvegarde via le même chemin qu'une création manuelle de question — garantissant que les questions générées par IA subissent exactement les mêmes contrôles de validité qu'une saisie humaine (Javadoc de la classe : *« Ne persiste rien elle-même (…) mêmes invariants qu'une question manuelle »*).
2. Le repli n'est déclenché que si le premier fournisseur **échoue** (exception réseau, HTTP non-2xx, JSON invalide) — pas par choix de coût ou de qualité ; si aucun des deux n'est configuré (clé API vide), l'échec est immédiat sans tentative réseau. La notion de « configuré » est volontairement minimaliste et vérifiée dans `AiProviderProperties` : `Gemini.isConfigured()`/`Grok.isConfigured()` renvoient simplement `apiKey != null && !apiKey.isBlank()` — il n'existe pas de drapeau `enabled` séparé, conformément à la convention du projet (« a provider is "configured" once its API key is non-blank, no separate enabled flag »).
3. La fenêtre de limitation (20 générations / 5 minutes) est une parmi sept compteurs Redis distincts définis dans `RateLimitService` (connexion, inscription, réinitialisation de mot de passe, renvoi de vérification, messagerie, assistant de cours, génération IA, upload) — chacun avec sa propre clé (`rate:<usage>:<id>`), son propre plafond et son propre TTL, tous incrémentés par la même méthode privée générique `check(key, maxAttempts, ttl, message)`.

### 4.2 Correction hybride d'un quiz (auto + manuelle) — `diagramme_sequence_correction_quiz_hybride.puml`

**Objectif.** Illustrer la réconciliation d'état entre notation automatique (QCM) et notation manuelle (questions ouvertes) au sein d'une même tentative de quiz.

**Participants.** `Étudiant`, `Formateur` (acteurs), `QuizController`, `QuizAttemptService`, `QuizGradingService`, `PostgreSQL`, `Redis`. Deux fragments `==` (« Soumission de la tentative » / « Correction manuelle »).

**Correspondance avec l'implémentation.**
- `QuizAttemptService.submit(...)` calcule bien le score en excluant les questions `ESSAY` (`scoreAnswers` → `isQuestionCorrect` renvoie `false` pour `ESSAY`, avec un flag `pendingReview` levé dès qu'une question ouverte est rencontrée) ; si `pendingReview`, le statut posé est `PENDING_REVIEW` sinon `PASSED`/`FAILED` selon le score — comportement identique à celui décrit.
- `QuizGradingService.gradeEssay(...)` fait un upsert d'`EssayGrade` puis appelle `finalizeIfFullyGraded(attempt)`, qui ne recalcule le score final et ne change le statut que si **toutes** les questions `ESSAY` de la tentative ont désormais une note — sinon retour silencieux, exactement comme représenté dans le fragment `alt`.
- La finalisation réutilise `quizAttemptService.applyPassEffects(...)` — la même méthode que la soumission automatique directe — pour déclencher badge/certificat/notification, confirmant l'annotation du diagramme *« réutilise la même logique que la soumission auto »*.

**Point de simplification assumée.** Le diagramme fait dialoguer directement `QuizController` avec `QuizAttemptService`/`QuizGradingService` ; dans le code, `QuizController` délègue en réalité à `QuizService` (couche fine de façade, conforme à la convention « contrôleur → un seul appel de service »), qui lui-même délègue à `QuizAttemptService.submit(...)` et `QuizGradingService.gradeEssay(...)`. C'est une simplification volontaire et cohérente du diagramme (un hop de délégation supplémentaire, purement mécanique, est omis) — signalé explicitement en §5, pas une erreur de fond.

**Points à retenir pour le jury.**
1. Le score final après correction manuelle est une moyenne pondérée : `(questions à choix correctes × 100 + Σ notes ESSAY) / nombre total de questions notables` (`QuizGradingService.finalizeIfFullyGraded`), pas une simple concaténation.
2. Une tentative `PENDING_REVIEW` bloque déjà la notification de résultat à l'étudiant (message « correction en attente ») — les effets de bord (badge, certificat) n'ont lieu qu'à la finalisation complète, jamais sur un score partiel.

### 4.3 Progression séquentielle par UF et cascade vers le certificat — `diagramme_sequence_progression_uf_certificat.puml`

**Objectif.** Illustrer comment la réussite d'un quiz de fin de module déclenche une vérification en cascade (module → UF → formation entière) pouvant aboutir à l'émission automatique d'un certificat.

**Participants.** `Étudiant` (acteur), `QuizAttemptService`, `ProgressionService`, `UfValidationService`, `CertificateService`, `PostgreSQL`.

**Correspondance avec l'implémentation.**
- `QuizAttemptService.applyPassEffects(...)` appelle bien `certificateService.tryIssueIfEligible(userId, ...)` uniquement si `passed && quiz.getQuizType() == QuizType.FIN_MODULE` — confirmé dans le code.
- `CertificateService.tryIssueIfEligible` vérifie d'abord qu'aucun certificat n'existe déjà, puis teste `modules.stream().allMatch(m -> progressionService.isModuleCompleted(userId, m.getId()))` pour **tous** les modules de la formation — la boucle « pour CHAQUE module » du diagramme est donc réelle.
- `createCertificate` génère un code de 16 caractères (`UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase()`) et un PDF via OpenPDF (`com.lowagie.text.*`) — conforme au diagramme.

**Nuance importante — corrigée (voir aussi §6).** Une première version de ce diagramme représentait la cascade comme si `tryIssueIfEligible` interrogeait directement `UfValidationService.isValidated(...)` pour chaque UF au moment de l'émission du certificat. En réalité, `isModuleCompleted(userId, moduleId)` — la méthode effectivement appelée par `tryIssueIfEligible` — délègue à `isModuleContentCompleted`, qui **ne vérifie que** les leçons complétées et le quiz `FIN_MODULE` ; elle n'appelle **pas** `UfValidationService`. La méthode `isUfFullyDone` (qui, elle, appelle réellement `ufValidationService.isValidated(...)`) est utilisée ailleurs, dans `isModuleAccessible` (déverrouillage séquentiel d'un module) et dans `isYear1FullyDone`/`isYear2FullyDone`. Le diagramme a été retravaillé en deux fragments `==...==` distincts : le déverrouillage séquentiel (où le gate UF est réellement vérifié) puis l'émission du certificat (qui ne fait que constater des modules déjà marqués complétés). Le résultat final observé reste le même — un étudiant ne peut de toute façon pas compléter les modules qui suivent UF 5/UF 11 tant que le Directeur ne les a pas validées — mais le diagramme place désormais l'appel `UfValidationService.isValidated(...)` au bon endroit de la chaîne technique.

**Points à retenir pour le jury.**
1. Le gate directeur (UF 5, UF 11) agit en amont, au moment du **déverrouillage** des modules suivants (`isModuleAccessible`), pas au moment de l'émission du certificat elle-même — cette dernière ne fait que constater que tous les modules sont « complétés au sens contenu », ce qui présuppose déjà que les gates ont été franchis.
2. `isModuleCompleted` est un simple alias public de `isModuleContentCompleted` (`return isModuleContentCompleted(...)`) — les deux noms coexistent dans le code, ce qui peut prêter à confusion en lecture rapide du diagramme.

### 4.4 Contrôle d'accès à granularité fine (au-delà du RBAC) — `diagramme_sequence_controle_acces_proprietaire.puml`

**Objectif.** Illustrer un principe de sécurité transversal du backend : le RBAC (`@PreAuthorize`) ne garantit que le rôle, jamais la propriété de la ressource — celle-ci est revérifiée dans le service à chaque opération sensible.

**Participants.** `Utilisateur A` (acteur), `MessagingController`, `SecurityConfig (@PreAuthorize)`, `MessagingService`, `PostgreSQL`.

**Correspondance avec l'implémentation.** `MessagingService.assertAccess(conversationId, principal)` existe littéralement avec la logique représentée : pour une conversation `COHORT_ROOM`, l'accès est accordé si `principal.getRole().isStaff()` **ou** si le groupe de l'utilisateur correspond au groupe de la conversation (`user.getGroup().getId().equals(conversation.getGroup().getId())`) ; pour une conversation `DIRECT`, l'accès nécessite une ligne `ConversationParticipant` existante (`participantRepository.findByConversationIdAndUserId(...)`). En cas d'échec, une `ForbiddenException("Cette conversation ne vous appartient pas.")` est levée — message identique, mot pour mot, à celui du diagramme. Le `RateLimitService.checkMessageAllowed(...)` est bien appelé après `assertAccess` et avant la persistance du message, avec un seuil `MESSAGE_MAX_ATTEMPTS = 30` (confirmé dans `RateLimitService.java`) correspondant aux « 30 messages / minute » annotés dans le diagramme.

**Vérification de la note d'audit du diagramme.** Le diagramme cite trois autres endroits appliquant le même motif (`NotificationService#markRead`, `LessonNoteService#requireOwnNote`, `StageService#assertCanUpload`) et signale une exception : `AssignmentService`, dont les opérations staff (notation, suppression) « ne revérifient aucune propriété de ressource au-delà du rôle ». Cette affirmation a été vérifiée directement dans `AssignmentService.java` : `gradeSubmission(submissionId, request, graderId)` et `delete(assignmentId)` chargent l'entité par identifiant et agissent dessus sans aucun contrôle d'appartenance (pas de vérification que `graderId` a un lien quelconque avec le module/l'assignment) — seule une éventuelle restriction de rôle au niveau du contrôleur (`@PreAuthorize`) protège ces opérations. La note du diagramme est donc **exacte et vérifiée**, pas une supposition générique.

**Points à retenir pour le jury.**
1. Ce diagramme documente un principe de sécurité (défense en profondeur : RBAC + contrôle de propriété applicatif), pas un seul endpoint — c'est une convention appliquée service par service, listée explicitement dans les conventions du projet (« Every endpoint touching a specific user's data needs either a role check … or an explicit ownership check inside the service »).
2. L'exception documentée (`AssignmentService`) constitue une limite connue et assumée du MVP, pas un oubli caché : le diagramme la nomme explicitement pour que le jury sache qu'elle a été identifiée et documentée plutôt que découverte a posteriori.

---

## 5. Diagrammes d'infrastructure (mingrammer / Python)

### 5.1 Architecture en couches — `diagrammes/mingrammer/diagramme_architecture.py`

**Objectif.** Donner une vue « boîtes et flèches » de l'architecture logicielle (couches applicatives + intégrations externes), complémentaire aux diagrammes UML de classes/séquence qui ne montrent pas la infrastructure environnante.

**Éléments représentés.** Client (navigateur Next.js) → cluster « Backend Spring Boot » (Sécurité JWT+RBAC → 31 Contrôleurs REST → Services métier → Repositories Spring Data JPA) → cluster « Données » (PostgreSQL + Redis) → cluster « Intégrations externes » (APIs IA Gemini/Grok, Bunny Stream, SMTP) + stockage disque (`data/media`).

**Correspondance avec l'implémentation.** Chaque bloc a un ancrage vérifiable dans le code : sécurité JWT (`jjwt-*` dans `pom.xml`, cookies httpOnly), 31 contrôleurs (compte vérifié en §1), services métier (`backend/.../service/`, 46 fichiers), repositories Spring Data JPA, PostgreSQL/Redis (`docker-compose.yml`), IA Gemini/Grok (`QuestionGenerationService`, `CourseAssistantService`), Bunny Stream (`BunnyStreamClient.java`, méthodes `.createVideo()`, `.uploadVideoBytes()`, `.hlsPlaybackUrl()`, `.fetchThumbnailBytes()`, `.deleteVideo()` toutes présentes dans le fichier), SMTP (`EmailService`/`EmailServiceImpl`). Le stockage disque `data/media` correspond au volume `./data/media:/data/media` prévu (commenté) dans `docker-compose.yml` et au répertoire `backend/data/` (volontairement non versionné, `.gitignore`).

**Points à retenir pour le jury.**
1. Ce diagramme est généré par script Python (bibliothèque `diagrams`, wrapper Graphviz), pas dessiné à la main — il peut donc être régénéré automatiquement après une évolution du code (`python diagramme_architecture.py`), contrairement aux `.puml` qui nécessitent une relecture manuelle du contenu du fichier source.
2. Les couleurs codent une distinction sémantique volontaire : navy pour le flux applicatif interne (maîtrisé), gold pour les intégrations externes (dépendance à un tiers), bleu-gris pour la couche données.

### 5.2 Diagramme de déploiement — `diagrammes/mingrammer/diagramme_deploiement.py`

**Objectif.** Montrer la topologie de déploiement cible (conteneurs, ports, volumes) — utile pour discuter la mise en production, distincte de l'architecture logicielle logique du §5.1.

**Éléments représentés.** Utilisateur → cluster Docker Compose (`nginx` reverse proxy `:80` → `frontend` Next.js `:3000` et `api` Spring Boot `:8080` → `postgres` `:16` et `redis` `:7`) → volume `data/media` → services externes (Gemini/Grok, Bunny Stream, SMTP).

**Correspondance avec l'implémentation — déjà détaillée en §1.** Le titre du diagramme porte explicitement la mention **« architecture cible »**, et le nom du cluster Docker Compose est légendé *« postgres + redis actifs aujourd'hui — api/frontend/nginx cibles »*. Vérification faite : `docker-compose.yml` ne démarre réellement que `postgres` (port hôte 5433 → conteneur 5432) et `redis` (port 6379) ; le service `api` y est présent mais entièrement en commentaire. Il n'existe aucune définition `nginx` ni `frontend` dans ce fichier — ces trois conteneurs sont donc une cible de déploiement documentée, pas encore un état constaté. Le diagramme est donc **honnête sur son propre statut** : il ne prétend pas décrire l'existant mais la cible, ce qui est exactement le cas.

**Points à retenir pour le jury.**
1. Le port PostgreSQL exposé côté hôte est `5433` (pas `5432`) dans `docker-compose.yml`, pour éviter un conflit avec une instance PostgreSQL locale déjà installée sur la machine de développement — détail absent du diagramme (qui ne représente que le port interne au réseau Docker, `:5432`), sans que ce soit une erreur : le diagramme documente la topologie logique de conteneurs, pas le mapping de ports hôte.
2. Le volume `data/media` est le point de jonction entre le stockage applicatif (certificats PDF générés par `CertificateService`, médias uploadés via `MediaService`) et l'infrastructure — cohérent avec `backend/data/` qui est volontairement non versionné dans Git.

---

## 6. Écarts identifiés

Conformément à la démarche de vérification systématique, voici le résultat croisé diagramme ↔ code, écart par écart :

1. **~~Rôle `SUPPORT` absent du diagramme de cas d'utilisation~~ — corrigé.** Le rôle existe et est actif dans le code (`Role.SUPPORT`, utilisé par `MessagingService` pour les contacts support). Un acteur `Support` (`--|> User`, hors chaîne staff) et un cas d'utilisation dédié « Assister les apprenants (lecture seule) » ont été ajoutés à `diagramme_cas_utilisation.puml`, reliés par `Support --> UC_Message` et `Support --> UC_SupportAssist`.
2. **Hiérarchie d'acteurs par généralisation UML vs enum plat en Java.** Le diagramme de cas d'utilisation modélise `Étudiant --|> User --|> …` comme une hiérarchie de classes ; le code réel utilise un `enum Role` plat à 5 valeurs avec une méthode `isStaff()`. C'est une convention de modélisation UML légitime pour représenter l'inclusion de permissions, mais elle ne doit pas être lue comme une hiérarchie de classes Java (impossible pour un enum). Choix conservé tel quel — ce n'est pas une erreur, juste une convention à expliquer à l'oral si le jury interroge dessus.
3. **~~Cascade de validation d'UF au moment de l'émission du certificat~~ — corrigé.** Le diagramme de séquence `diagramme_sequence_progression_uf_certificat.puml` faisait apparaître un appel direct `Progression -> UfValidation : isValidated(...)` à l'intérieur du chemin d'émission de certificat (`tryIssueIfEligible`), alors que ce chemin appelle en réalité `isModuleCompleted` → `isModuleContentCompleted` (qui ne consulte pas `UfValidationService`). Le diagramme a été redécoupé en deux fragments `==...==` : « Déverrouillage séquentiel du module suivant » (où `isModuleAccessible` → `isUfFullyDone` appelle réellement `UfValidationService.isValidated`) puis « Réussite du dernier module et émission du certificat » (qui ne fait que constater des modules déjà complétés), avec une note explicite précisant que le gate a déjà été appliqué en amont.
4. **Simplification assumée dans les diagrammes de séquence « correction hybride » et « contrôle d'accès ».** Ces deux diagrammes font dialoguer `QuizController`/`MessagingController` directement avec le service métier final (`QuizAttemptService`, `QuizGradingService`, `MessagingService`), en omettant la couche de façade fine intermédiaire (`QuizService`) quand elle existe. C'est cohérent avec l'esprit pédagogique du diagramme (ne pas polluer le flux avec un hop mécanique de délégation), mais mérite d'être mentionné à l'oral si le jury demande à retracer un appel précisément dans le code.
5. **`Certificate` et `LearnerUfValidation` : quelques attributs réels omis pour lisibilité.** `Certificate.deliveredAt`/`deliveredNote` (livraison physique du diplôme) n'apparaissent pas dans `diagramme_classes_stage_certification.puml` bien qu'ils existent dans l'entité — simplification volontaire sans incidence sur la compréhension du modèle, à signaler par honnêteté plutôt qu'à considérer comme une erreur.
6. **Tout le reste correspond exactement.** Les quatre diagrammes de classes (structure, attributs, cardinalités, énumérations), les quatre diagrammes de séquence (participants, messages, fragments conditionnels) et les deux diagrammes mingrammer (composants, ports, statut « cible » assumé) ont été confrontés point par point au code source actuel sans autre divergence trouvée. En particulier, les quatre énumérations métier centrales (`QuizType`, `QuestionType`, `AttemptStatus`, `Role`) sont recopiées à l'identique du code Java, et le compte de 31 contrôleurs REST affiché dans le diagramme d'architecture est exact au jour de la rédaction de ce document.
