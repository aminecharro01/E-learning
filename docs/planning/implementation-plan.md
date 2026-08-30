# Plan d'implémentation — Nouvelles fonctionnalités IAT Academy

> Source principale : `graphify-out/` (graph re-synchronisé le 2026-08-06 — `graphify . --update` : 0 fichier changé, 395 inchangés, graphe passé à 2414 nœuds / 5470 arêtes suite à l'intégration de fonctionnalités déjà mergées depuis la dernière analyse complète). Complété par lecture ciblée des fichiers réellement concernés (entités, enums, un contrôleur/service/page représentatif par convention) — jamais un scan complet du dépôt.
>
> **Aucune nouvelle architecture n'est proposée.** Chaque fonctionnalité est greffée sur les packages, conventions et entités existants. Quand une fonctionnalité demandée existe déjà (même partiellement), c'est signalé explicitement plutôt que réinventé.

---

## 0. Constat clé — une partie du travail existe déjà

Avant de lire le reste : le dépôt a beaucoup avancé depuis la dernière vue d'ensemble. Plusieurs fonctionnalités demandées sont **déjà en place, au moins partiellement**. Les traiter comme "à créer" gonflerait le plan inutilement.

| Demandé | État réel | Fichiers |
|---|---|---|
| Forums de discussion | **Partiel** — commentaires par leçon, à plat (pas de fils/réponses), modération (`hidden`) déjà là | `LessonComment`, `CommentController`, `CommentService` |
| Promos / Cohortes / Drip content | **Largement fait** — groupes d'apprenants + programmation de contenu par date d'ouverture | `LearnerGroup`, `GroupContentAssignment`, `GroupController`, `GroupContentService`, `EnrollmentMode` (enum présent mais pas encore relié à `LearnerGroup`) |
| Notifications in-app | **Fait** — entité, types, service, contrôleur, liste non-lues | `Notification`, `NotificationType`, `NotificationService`, `NotificationController` |
| Gamification (badges) | **Fait** (3 badges) — pas de niveaux ni de classement | `UserBadge`, `BadgeCode`, `BadgeService`, `BadgeController` |
| Réinitialisation mot de passe + token expirant + vérification email | **Fait intégralement** | migration `V11__auth_tokens.sql`, `AuthController` (`forgot-password`, `reset-password`, `verify-email`, `resend-verification`) |
| Journal d'audit | **Fait** — réutilisable pour l'anti-triche et le gradebook | `AuditLogEntry`, `AuditLogService` |
| Rate limiting Redis | **Fait** — pattern directement réutilisable (messagerie, forum) | `RateLimitService` |
| Export Excel | **Dépendance déjà là** (`poi-ooxml`, utilisée par `GroupImportService` pour l'import) — réutilisable pour l'export gradebook |
| Export PDF | **Dépendance déjà là** (`openpdf`, utilisée par `CertificateService`) |
| Agenda / calendrier | **Amorcé seulement** — `AgendaService.myAgenda()` existe mais c'est une vue agrégée simple (échéances quiz probablement), pas un système d'évènements générique |

Le reste de ce document ne redécrit pas ces briques — il indique, pour chaque fonctionnalité, **quoi étendre** plutôt que quoi recréer.

---

## 1. Conventions du projet (à respecter partout — non répété section par section)

- **Entités** : `@Entity @Table(name="snake_case") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, héritent de `AuditableEntity` (`createdAt`/`updatedAt` auto), id `UUID` en `GenerationType.UUID`.
- **Enums** : enums Java simples dans `domain.enums`, parfois avec libellés (`BadgeCode`).
- **JSON flexible** : colonne `jsonb` + `@JdbcTypeCode(SqlTypes.JSON)` déjà utilisée (`QuizAttempt.answers`, `.questionOrder`) — pattern à réutiliser plutôt que multiplier des tables pour des structures variables (hotspot, matching…).
- **DTO** : `record`, un package par domaine sous `dto/` (`dto.group`, `dto.comment`, `dto.notification`…) — **pas de MapStruct**, mapping manuel via une méthode privée `toResponse()` dans le service.
- **Contrôleurs** : `@RestController @RequestMapping("/api/...") @RequiredArgsConstructor`, `@PreAuthorize` en tête de classe pour les endpoints 100% admin (ex. `GroupController` → `hasRole('ADMIN')`) ou par méthode pour les contrôleurs mixtes (ex. `QuizController`), acteur récupéré via `@AuthenticationPrincipal UserPrincipal principal`.
- **Repositories** : Spring Data JPA, méthodes dérivées (`findByGroupIdAndModuleId`, `findByUserIdOrderByAwardedAtDesc`…).
- **Exceptions** : `ApiException` (400), `NotFoundException` (404), `ForbiddenException` (403), `RateLimitException` (429), `GoneException` (410) — centralisées dans `GlobalExceptionHandler`. Toute nouvelle règle métier doit lever l'une de celles-ci, pas une exception ad hoc.
- **Notifications** : `notificationService.notify(user, NotificationType.X, title, message, link)`.
- **Audit** : `auditLogService.record(actorId, "ACTION_CODE", "EntityType", entityId, details)`.
- **Migrations** : Flyway séquentiel `Vn__description.sql` (dernier : `V19__group_content_assignments.sql`) — un fichier par lot cohérent de changements, commentaire en tête expliquant le *pourquoi* d'un choix non trivial (style déjà en place).
- **Frontend admin** : page `"use client"`, `ComponentCard` (carte de section), `Skeleton` (chargement), `toast` (`@/lib/toast-store`), `btn`/`inputClass` (`@/lib/ui`), fonctions API typées dans `@/lib/api.ts` (au-dessus de l'axios `apiClient`), types dans `@/types/domain`, layout maître-détail `grid lg:grid-cols-[320px_1fr]` pour les écrans liste+détail (`admin/groups`), formatage date `Intl.DateTimeFormat("fr-FR", …)`.
- **Rôles** : `SUPER_ADMIN`, `ADMIN` (Directeur), `FORMATEUR`, `ETUDIANT`, `SUPPORT`. `Role.isStaff()` = `SUPER_ADMIN|ADMIN|FORMATEUR`.

---

## 2. Forums de discussion (par leçon/module)

### Existant à étendre
`LessonComment` (lesson_id, author_id, body, hidden) + `CommentController`/`CommentService` (`list`, `create`, `hide`).

### Backend
- **Entité** : étendre `LessonComment` → ajouter `parent_id` (self-FK nullable, thread de réponses), `pinned` (boolean, épinglage), `module_id` (nullable — contrainte `CHECK (lesson_id IS NOT NULL OR module_id IS NOT NULL)` pour couvrir "par leçon **ou** module").
- **Package** : `domain.entity.LessonComment` (renommage optionnel en `DiscussionPost` non nécessaire — l'existant reste correct, juste étendu).
- **Service** : `CommentService` — ajouter `reply()`, `pin()`/`unpin()`, `listThreaded()` (regroupement parent/réponses côté service, pas de récursivité SQL nécessaire vu le volume attendu).
- **Controller** : `CommentController` — ajouter `POST /api/comments/{id}/reply`, `PATCH /api/comments/{id}/pin`.
- **DTO** : étendre `dto.comment.CommentResponse` avec `parentId`, `pinned`, `authorRole` (pour afficher le badge Formateur côté front sans requête supplémentaire), `replies: List<CommentResponse>` (1 niveau, pas de nesting infini).
- **Permissions** : création = tout utilisateur authentifié ayant accès à la leçon/module (réutiliser la logique d'accès déjà présente dans `LessonService`/`ProgressionService` — un module verrouillé ne doit pas exposer son forum). Épinglage/masquage = `@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")`, cohérent avec le reste des endpoints de modération.
- **Validation** : `body` non vide, longueur max (ex. 5000 caractères) via `@Size` sur le DTO de requête.

### Frontend
- **Composant** : `frontend/src/components/learner/LessonDiscussion.tsx` (nouveau, injecté dans `app/learn/[moduleId]/s/[lessonId]/page.tsx`, à côté du lecteur/blocs existants).
- **Hooks** : pas de nouveau state manager — `useState`/`useEffect` + `@/lib/api` comme `admin/groups/page.tsx`.
- **UI** : liste + formulaire de réponse, bouton "Épingler" visible seulement si `isStaff` (via `useAuth()`), badge "Formateur" si `authorRole` staff.
- **Admin** : vue de modération dans `admin/` (liste des commentaires masqués/signalés) — réutiliser le pattern master-détail.

### DB
Migration `V20__discussion_threads.sql` : `ALTER TABLE lesson_comments ADD COLUMN parent_id UUID REFERENCES lesson_comments(id) ON DELETE CASCADE, ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE; ALTER TABLE lesson_comments ALTER COLUMN lesson_id DROP NOT NULL;` + `CHECK` + index sur `parent_id` et `module_id`.

### Performance
Pagination obligatoire (`Pageable`, pattern déjà utilisé pour `listUsersPaged`) dès qu'un fil dépasse ~50 messages. Pas de cache Redis nécessaire au volume attendu.

---

## 3. Promos / Classes / Cohortes + Drip Content

### Existant à étendre
`LearnerGroup` (name, created_by) + FK unique `users.group_id` (un apprenant = un seul groupe) + `GroupContentAssignment` (group_id, module_id, uf_code, unlock_at) → **c'est déjà le mécanisme de drip content demandé**, calculé à la volée (`unlockAt <= now()`), sans job planifié.

### Ce qui manque réellement
Seulement la **notion de promo/millésime** (le modèle actuel gère "un groupe", pas "une promo avec dates").

### Backend
- **Entité** : `ALTER TABLE learner_groups` → ajouter `code` (ex. `"2026-A"`, unique), `start_date`, `end_date`, `enrollment_mode` (relier l'enum `EnrollmentMode` déjà défini mais non utilisé aujourd'hui — évite de créer un doublon conceptuel).
- **Service** : `GroupService.create()` — étendre le DTO `CreateGroupRequest` avec ces champs.
- **Pas de nouvelle entité `Cohort`** : en créer une séparée dupliquerait `LearnerGroup` pour une différence purement cosmétique (nom + dates). Étendre l'existant est strictement plus cohérent avec le code actuel.

### Frontend
`admin/groups/page.tsx` — ajouter les champs code/dates/mode au formulaire de création déjà présent, les afficher dans la carte `ComponentCard title={selected.name}`.

### DB
Migration `V21__cohort_metadata.sql` : `ALTER TABLE learner_groups ADD COLUMN code VARCHAR(30) UNIQUE, ADD COLUMN start_date DATE, ADD COLUMN end_date DATE, ADD COLUMN enrollment_mode VARCHAR(20);`

### Sécurité
Aucun changement — `GroupController` est déjà `hasRole('ADMIN')` pour toute la gestion de groupe.

---

## 4. Carnet de notes (Gradebook)

### Constat
Aucune vue agrégée n'existe. Les données brutes existent (`QuizAttempt.score`), mais rien ne les assemble en matrice Étudiants × Évaluations, et il n'y a pas encore de notion de "devoir" (hors quiz) ni de bonus manuel.

### Backend — nouvelles entités
- **`Assignment`** (devoir) : `id, module_id (FK ModuleEntity), title, description, due_at, max_score, created_by (FK User)` + `AuditableEntity`.
- **`Submission`** : `id, assignment_id (FK), user_id (FK), asset_id (FK Asset — réutilise `AssetController`/`MediaService` existants pour l'upload de fichier, aucun nouveau système de stockage)`, `submitted_at, status enum(SUBMITTED, LATE, GRADED), grade (BigDecimal, nullable), feedback (text), graded_by (FK User), graded_at`.
- **`GradeAdjustment`** (bonus/malus manuel) : `id, user_id (FK), module_id (FK), points (BigDecimal), reason (text), created_by (FK User)`.
- **Packages** : `domain.entity.Assignment`, `.Submission`, `.GradeAdjustment` ; enums `domain.enums.SubmissionStatus`.

### Backend — services/contrôleurs
- **`AssignmentService`/`AssignmentController`** (`/api/admin/assignments`, `/api/assignments/{id}/submit` côté apprenant) — CRUD devoir + dépôt (upload via `MediaService.upload(file, "DOCUMENT", ownerId)`, réutilise le contrôle d'accès par propriétaire déjà implémenté).
- **`GradebookService`/`GradebookController`** (`/api/admin/modules/{moduleId}/gradebook`) — **lecture seule agrégée**, pas de nouvelle table de faits : jointure `QuizAttempt` (meilleure tentative par quiz/utilisateur) + `Submission.grade` + `GradeAdjustment` par module, retournée en matrice `{ students: [...], evaluations: [...], cells: [[...]] }`.
  - `PATCH /api/admin/gradebook/attempts/{id}/score` (correction manuelle d'une tentative, cf. §5) et `POST /api/admin/gradebook/adjustments` (bonus) — délèguent respectivement à `QuizService`/`GradeAdjustmentService`, `GradebookService` ne fait qu'agréger en lecture.
- **Export** : `GradebookService.exportExcel()` via `poi-ooxml` (même dépendance que `GroupImportService`, usage en écriture au lieu de lecture) ; `exportCsv()` sans dépendance (écriture manuelle, format simple).

### Frontend
- **Page** : `app/(admin)/admin/modules/[id]/gradebook/page.tsx` (nouveau, à côté de `admin/modules/[id]/page.tsx` existant).
- **Composant** : tableau matriciel (nouveau `components/admin/GradebookTable.tsx`) — cellule éditable inline pour `score`/bonus, boutons "Exporter Excel"/"Exporter CSV" déclenchant un téléchargement (`window.open` vers l'endpoint, pattern déjà utilisé pour `certificates/me/download`).

### Sécurité
`hasAnyRole('ADMIN','FORMATEUR')` sur tout `/api/admin/gradebook/**` et `/api/admin/assignments/**`. Dépôt de devoir (`POST /api/assignments/{id}/submit`) = apprenant authentifié, ownership vérifié comme pour les documents de stage existants (`MediaService.assertReadable`).

### DB
`V22__assignments_gradebook.sql` : tables `assignments`, `submissions` (FK `asset_id → assets`, `assignment_id → assignments` `ON DELETE CASCADE`, `user_id → users`), `grade_adjustments`. Index sur `submissions(assignment_id, user_id)` (unique — un dépôt actif par apprenant/devoir) et `grade_adjustments(module_id, user_id)`.

### Performance
La matrice gradebook est un `GROUP BY` sur potentiellement plusieurs centaines de lignes par module — acceptable sans cache à l'échelle actuelle (36 modules, effectifs modestes). À surveiller si le nombre d'apprenants par module dépasse quelques centaines : ajouter pagination par cohorte.

---

## 5. Correction manuelle

### Ce qui est concerné
Deux flux distincts, tous deux déjà couverts par les entités du §4 et du §6 :
1. **Devoirs** (`Submission`) → `PATCH /api/admin/submissions/{id}/grade` (`grade`, `feedback`) — simple mise à jour d'un enregistrement existant, rien de nouveau à concevoir.
2. **Questions ouvertes de quiz** (type `ESSAY`, §6) → nécessite un point d'ancrage par question au sein d'une tentative, ce que `QuizAttempt.answers` (une seule valeur par question) ne permet pas de noter individuellement avec traçabilité (qui a corrigé, quand, quel commentaire).

### Backend — nouvelle entité
**`EssayGrade`** : `id, attempt_id (FK QuizAttempt), question_id (FK Question), score (BigDecimal), feedback (text), graded_by (FK User), graded_at`. Une tentative contenant des questions `ESSAY` passe en `AttemptStatus.PENDING_REVIEW` (nouvelle valeur d'enum, cf. §6) tant que toutes ses `EssayGrade` ne sont pas renseignées ; `QuizService` recalcule alors `QuizAttempt.score`/statut final.

### Service/Controller
`QuizService.gradeEssay(attemptId, questionId, score, feedback, graderId)` (méthode ajoutée, pas de nouveau service — reste dans `QuizService` qui possède déjà toute la logique de scoring) + `QuizController` : `GET /api/admin/quiz/attempts/pending-review`, `PATCH /api/admin/quiz/attempts/{id}/questions/{qid}/grade`.

### Frontend
`app/(admin)/admin/quiz-bank/page.tsx` — nouvel onglet "À corriger" listant les tentatives `PENDING_REVIEW`, formulaire de notation par question ouverte (`components/admin/forms/EssayGradeForm.tsx`, nouveau, même style que `QuestionForm.tsx`).

### DB
Inclus dans `V23__question_types.sql` (§6) — `essay_grades` (FK `attempt_id`, `question_id`, unique sur la paire).

### Sécurité
`hasAnyRole('ADMIN','FORMATEUR')`. Notification à l'apprenant (`NotificationType.QUIZ_GRADED`, déjà existant) une fois la correction complète.

---

## 6. Quiz — nouveaux types de questions

### Existant
`QuestionType { SINGLE_CHOICE, MULTI_CHOICE, TRUE_FALSE }`, `Question` (prompt, options via `AnswerOption`), `QuizAttempt.answers: Map<questionId, List<optionId>>`.

> Note : la demande liste "MULTIPLE_CHOICE" parmi les types à ajouter — l'équivalent existe déjà sous le nom `MULTI_CHOICE`. Aucune duplication proposée.

### Backend
- **Enum** : `QuestionType` → ajouter `MATCHING, HOTSPOT, FILL_BLANK, ESSAY`.
- **Entité `Question`** : ajouter une colonne `metadata jsonb` (`@JdbcTypeCode(SqlTypes.JSON)`, même pattern que `QuizAttempt`) portant la structure spécifique au type :
  - `MATCHING` → `{ pairs: [{ left, right }] }` (les paires correctes ; les items mélangés sont dérivés côté frontend).
  - `HOTSPOT` → `{ imageAssetId, zones: [{ x, y, width, height, label }] }` — **réutilise `Asset`/`MediaService` existants** pour l'image, aucun nouveau système de fichiers.
  - `FILL_BLANK` → `{ template: "...", blanks: [{ index, acceptedAnswers: [...] }] }`.
  - `ESSAY` → pas de métadonnées obligatoires (option `maxLength`).
  - `SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE` : `metadata` reste `null`, `AnswerOption` inchangé — **zéro régression sur l'existant**.
- **Entité `QuizAttempt`** : généraliser `answers` de `Map<String, List<String>>` vers `Map<String, Object>` (toujours `jsonb`, juste un typage Java plus permissif) pour porter indifféremment une liste d'ids (choix), une chaîne (fill-blank/essay), ou une structure de paires (matching/hotspot) selon le type de question — évite de multiplier les colonnes `matchingAnswers`/`hotspotAnswers` alors qu'une seule colonne JSON flexible (déjà le pattern du projet) suffit.
- **Enum `AttemptStatus`** : ajouter `PENDING_REVIEW` (tentative contenant au moins une question `ESSAY` non encore corrigée — cf. §5).
- **`QuizService`** : la méthode de scoring (privée, appelée par `submit()`) doit brancher par `QuestionType` :
  - `MATCHING`/`FILL_BLANK` : comparaison automatique (normalisation casse/accents pour `FILL_BLANK`).
  - `HOTSPOT` : test d'inclusion point-dans-rectangle (coordonnées soumises vs `zones`).
  - `ESSAY` : pas de score auto → statut `PENDING_REVIEW`, score final recalculé après correction (§5).

### Frontend
- **Édition** (`components/admin/forms/QuestionForm.tsx`) : étendre le formulaire existant avec un sous-formulaire conditionnel par type (réutiliser `BlockEditor.tsx` comme référence de switch-par-type déjà en place pour les blocs de leçon). Pour `HOTSPOT`, un éditeur de zones sur image (nouveau composant `components/admin/HotspotEditor.tsx`, `<canvas>` ou overlay `<div>` positionné en `%` — pas de dépendance externe nécessaire).
- **Passage du quiz** (`app/app/learn/[moduleId]/quiz/[quizId]/page.tsx` + `QuizBody()` existant, communauté "Quiz Taking & Media Blocks") : ajouter les composants de saisie par type (`MatchingQuestion.tsx`, `HotspotQuestion.tsx`, `FillBlankQuestion.tsx`, `EssayQuestion.tsx`, tous nouveaux, même dossier que les composants de quiz existants).

### DB
`V23__question_types.sql` : `ALTER TABLE questions ADD COLUMN metadata JSONB; ALTER TABLE quiz_attempts ALTER COLUMN answers TYPE JSONB;` (déjà `jsonb`, changement Java seulement côté `QuizAttempt`) + table `essay_grades` (§5).

### Sécurité
Aucun changement de permissions — les endpoints `QuizController` existants (`hasAnyRole('ADMIN','FORMATEUR')` pour la gestion, apprenant authentifié pour `start`/`submit`) couvrent déjà tous les types.

---

## 7. Question Bank + génération automatique d'examens

### Backend
- **Ne pas dupliquer `Question`/`AnswerOption`** : la banque est un *pool* de questions qui existent déjà dans le même modèle, juste non rattachées directement à un quiz.
  - **Entité `QuestionBank`** : `id, name (ex. "Sécurité Niveau 2"), description, created_by`.
  - **`Question`** : relâcher `quiz_id` en `nullable`, ajouter `question_bank_id` (FK nullable). Contrainte `CHECK (quiz_id IS NOT NULL OR question_bank_id IS NOT NULL)` (une question appartient à un quiz **ou** à une banque, jamais ni l'un ni l'autre).
- **Génération d'examen** : `CreateQuizRequest` (existant, `dto.quiz`) → ajouter `drawFromBankId (UUID, optionnel), drawCount (int, optionnel)`. `QuizService.createQuiz()` : si ces champs sont renseignés, tirer `drawCount` questions aléatoires dans la banque (`Collections.shuffle` + `limit`, pas besoin de `ORDER BY random()` côté SQL vu les volumes) et **cloner** (pas référencer) `Question`+`AnswerOption` avec le nouveau `quiz_id` — cohérent avec le cascade `ALL`/`orphanRemoval` déjà en place sur `Quiz.questions`, et ça isole le quiz généré d'une modification ultérieure de la banque. Ajouter `source_bank_item_id` (nullable) sur `Question` pour la traçabilité.

### Frontend
`app/(admin)/admin/quiz-bank/page.tsx` (déjà existant — actuellement une "banque" au sens large, à vérifier/étendre) : ajouter la gestion de banques nommées + un bouton "Générer un examen" (formulaire : banque, nombre de questions, puis appel à `POST /api/quiz` avec `drawFromBankId`/`drawCount`).

### DB
`V24__question_bank.sql` : table `question_banks`, `ALTER TABLE questions ADD COLUMN question_bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE, ADD COLUMN source_bank_item_id UUID, ALTER COLUMN quiz_id DROP NOT NULL, ADD CONSTRAINT chk_question_owner CHECK (quiz_id IS NOT NULL OR question_bank_id IS NOT NULL);`

### Sécurité
`hasAnyRole('ADMIN','FORMATEUR')`, identique aux endpoints quiz existants.

---

## 8. Anti-triche (optionnel, activable par le directeur)

### Backend
- **`Quiz`** : ajouter `proctoring_enabled, focus_loss_detection, copy_protection, lockdown_mode` (booléens, défaut `false` — opt-in explicite par quiz). Un réglage global par défaut peut être exposé dans `AppSettingsService`/`AppSettingsRequest` (déjà le point d'entrée des réglages plateforme) pour pré-cocher ces options à la création.
- **Entité `ProctoringEvent`** : `id, attempt_id (FK QuizAttempt), type enum(FOCUS_LOST, TAB_HIDDEN, COPY_ATTEMPT, PASTE_ATTEMPT, FULLSCREEN_EXIT), occurred_at, meta jsonb`. Table dédiée plutôt que `AuditLogService` générique : elle doit être filtrable *par tentative* pour l'écran de correction, ce qu'un journal d'audit générique rend plus coûteux à interroger.
- **Endpoint** : `POST /api/quiz/attempts/{id}/proctoring-events` (apprenant, pendant la tentative) + `GET /api/admin/quiz/attempts/{id}/proctoring-events` (staff).

### Frontend
Dans la page de passage de quiz : écouteurs `visibilitychange`/`blur` (focus perdu), `oncopy`/`oncontextmenu` (désactivés si `copyProtection`), `Fullscreen API` + avertissement `beforeunload` si `lockdownMode`. Chaque évènement → `POST` vers le nouvel endpoint (débit limité côté client, ex. 1 évènement/2s max, pour ne pas spammer l'API).

### Point d'honnêteté à noter dans le plan (et à communiquer au client)
- Aucun verrouillage client-side n'est réellement infranchissable (l'apprenant garde le contrôle du navigateur) — ces mesures dissuadent et tracent, elles n'empêchent pas un contournement déterminé.
- "Marqueurs invisibles contre les LLM" : techniquement réalisable (caractères Unicode invisibles ou texte hors-écran injecté dans le DOM du prompt, qu'un copier-coller emporterait dans le presse-papier et polluerait une requête à un LLM) — mais c'est une mesure de gêne, pas une protection fiable ; à présenter comme telle plutôt que comme une garantie anti-triche.

### DB
`V25__proctoring.sql` : `ALTER TABLE quizzes ADD COLUMN proctoring_enabled BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN focus_loss_detection BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN copy_protection BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN lockdown_mode BOOLEAN NOT NULL DEFAULT FALSE;` + table `proctoring_events` (index sur `attempt_id`).

### Sécurité/Permissions
Activation des options = `hasAnyRole('ADMIN','FORMATEUR')` (création/édition de quiz, permissions déjà en place). Lecture des évènements = staff uniquement.

---

## 9. Analytics & Tracking

### 9.1 Temps réel (temps passé par cours/leçon/vidéo)

- **Entité `TimeTrackingLog`** (demandée explicitement) : `id, user_id (FK), lesson_id (FK, nullable), module_id (FK, nullable), asset_id (FK Asset, nullable — pour la vidéo), event_date (DATE), seconds_spent (int)`. **Une ligne par utilisateur/leçon/jour**, pas par évènement brut — sinon le volume d'écriture explose pour un gain d'analyse nul.
- **Flux d'ingestion** : le lecteur (`VideoPlayer.tsx`, déjà instrumenté avec `onTimeUpdate`/`onProgress`) envoie un heartbeat toutes les ~15s avec le delta regardé. Backend : `TimeTrackingService.recordHeartbeat()` **incrémente un compteur Redis** (`INCR time:{userId}:{lessonId}:{date}`, TTL 48h — même pattern que `RateLimitService`), pas d'écriture SQL synchrone. Un job planifié (`@Scheduled`, toutes les heures) flush les compteurs Redis vers `TimeTrackingLog` (upsert par jour) puis les supprime.
- **Réutilise** : `LessonProgress.videoWatchedPercent` existant reste la source du "vu à X%" (inchangé) ; `TimeTrackingLog` ajoute la dimension temporelle/historique que `LessonProgress` ne porte pas (une seule ligne par user/leçon, écrasée).

### 9.2 Early Warning System

- **Pas de nouvelle entité** : requête sur données existantes — `LessonProgress.updatedAt` (dernière activité) + `Submission.due_at`/`Assignment` (retard) + `QuizAttempt` (échéances de retry).
- **`EarlyWarningService`** (nouveau) : `findInactiveSince(days)` (aucune `LessonProgress` mise à jour depuis N jours, seuil configurable via `AppSettingsService`, cohérent avec le pattern de réglages existant), `findLateSubmissions()`.
- **Alertes** : notification au staff (nouveau `NotificationType.STUDENT_INACTIVE`, réutilise `NotificationService.notify()`), affichées dans un nouveau panneau admin.

### 9.3 Rapports (PDF / Excel / CSV)

- **`ReportService`** (nouveau, `service/ReportService.java`) : agrège `TimeTrackingLog`, `QuizAttempt`, `LessonProgress` par module/cohorte. Export via **dépendances déjà présentes** : `poi-ooxml` (Excel), `openpdf` (PDF, même lib que `CertificateService`), CSV en écriture manuelle (aucune dépendance).
- **Controller** : `GET /api/admin/reports/{type}?format=pdf|xlsx|csv`.

### Frontend
Nouvelle page `admin/analytics/page.tsx` (graphiques simples — pas de nouvelle dépendance de charting nécessaire pour un MVP : quelques barres/heatmap CSS suffisent au volume de données ; si des graphiques plus riches sont voulus plus tard, `recharts` est la seule dépendance à évaluer, aucune n'est présente aujourd'hui). Panneau "Alertes" (early warning) dans `admin/page.tsx` (dashboard existant).

### DB
`V26__time_tracking.sql` : table `time_tracking_logs` (unique `(user_id, lesson_id, event_date)`, index sur `(module_id, event_date)` pour les rapports).

### Performance
Le point sensible est l'écriture de tracking — d'où l'agrégation Redis avant flush SQL (au lieu d'un `INSERT` par heartbeat de 15s, potentiellement des dizaines de milliers de lignes/jour). Les rapports agrégés doivent être paginés/filtrés par période, jamais un `SELECT *` sur `time_tracking_logs`.

---

## 10. Communication

### 10.1 Notifications (extension)

- **In-app** : déjà fait, rien à reconstruire.
- **Email** : `NotificationService.notify()` — ajouter un paramètre `alsoEmail: boolean` qui appelle `EmailService.send()` (déjà injectable, déjà utilisé pour les mails transactionnels d'auth) en plus de créer l'enregistrement `Notification`. Aucune nouvelle entité.
- **Push (Web Push)** : nécessite un vrai nouveau composant, absent aujourd'hui.
  - **Entité `PushSubscription`** : `id, user_id (FK), endpoint, p256dh_key, auth_key, created_at`.
  - **Dépendance** : bibliothèque Web Push côté serveur (ex. `nl.martijndwars:web-push`) — seule vraie nouvelle dépendance backend de cette section.
  - **Frontend** : `Notification.requestPermission()` + enregistrement du service worker (à mutualiser avec la PWA, §14) + `PushManager.subscribe()`.
- **Nouveaux `NotificationType`** : `ASSIGNMENT_DUE_SOON`, `FORUM_REPLY`, `GRADE_PUBLISHED`, `STUDENT_INACTIVE` (§9.2), `SESSION_REMINDER` (§13). Simple ajout de valeurs d'enum, pas de migration nécessaire (colonne déjà `VARCHAR`).

### 10.2 Messagerie (élève ↔ formateur, salon par cohorte)

- **Entités nouvelles** : `Conversation (id, type enum(DIRECT, COHORT_ROOM), group_id FK nullable — pour les salons de cohorte)`, `ConversationParticipant (conversation_id, user_id)`, `Message (conversation_id, sender_id, body, read_at nullable)`.
- **Temps réel — recommandation** : démarrer en **polling** (`GET /api/conversations/{id}/messages?since=`), exactement le pattern déjà utilisé par `NotificationController.list()` — cohérent avec l'existant, zéro nouvelle dépendance. Passer à `spring-boot-starter-websocket` (STOMP) est une évolution Phase 2 si le besoin de vrai temps réel se confirme (nouvelle dépendance backend **et** frontend, complexité de déploiement derrière Nginx à anticiper — sujet à traiter séparément, pas dans ce lot).
- **Controller/Service** : `MessagingController`/`MessagingService`, permissions : un `ETUDIANT` ne peut écrire que dans une conversation dont il est participant ; les salons de cohorte sont créés automatiquement à la création d'un `LearnerGroup` (hook dans `GroupService.create()`).

### DB
`V27__notifications_messaging.sql` : `push_subscriptions`, `conversations`, `conversation_participants` (unique `(conversation_id, user_id)`), `messages` (index `(conversation_id, created_at)`).

### Sécurité
Ownership vérifié à chaque lecture/écriture de message (participant de la conversation), même logique que `MediaService.assertReadable` pour les documents privés.

### Performance
Rate limiting sur l'envoi de message (réutiliser `RateLimitService`, même pattern Redis) pour éviter le spam. Pagination obligatoire sur l'historique de messages.

---

## 11. Gamification (extension)

### Existant
`UserBadge`/`BadgeCode` (3 badges)/`BadgeService.awardIfAbsent()`.

### Backend
- **Plus de badges** : ajout de valeurs à `BadgeCode` (aucune migration — colonne `VARCHAR` existante) + appels `badgeService.awardIfAbsent()` aux points pertinents déjà instrumentés (`QuizService`, `UfValidationService` déjà injectent `BadgeService` d'après le graphe).
- **Niveaux** : pas de nouvelle table — calcul dérivé (nombre de badges + modules complétés) exposé par un `GamificationService.computeLevel(userId)`. Rester dérivé évite une source de vérité supplémentaire à synchroniser.
- **Classement (optionnel, par cohorte)** : `LeaderboardController` (lecture seule) — agrège `QuizAttempt.score` par `users.group_id`. **Mettre en cache Redis** (TTL court, ex. 5 min — clé `leaderboard:{groupId}`) car c'est un agrégat coûteux si interrogé à chaque chargement de page ; pattern cohérent avec l'usage Redis déjà établi dans le projet (verrous, rate limit).

### Frontend
Widget `components/learner/BadgeShelf.tsx` (nouveau, ou extension d'un composant existant si un affichage de badges existe déjà côté profil) + page classement optionnelle dans `app/app/page.tsx` (dashboard apprenant), activable/désactivable via un réglage `AppSettingsResponse.leaderboardEnabled` (pattern réglages existant).

### DB
Aucune nouvelle table structurante — juste les valeurs d'enum `BadgeCode` supplémentaires (pas de migration Flyway nécessaire, c'est une colonne `VARCHAR` sans contrainte `CHECK`).

---

## 12. Back-office Email (Newsletter / Campagnes)

### Existant
`NewsletterSubscriber`, `ContactMessage` — stockage seul (le `DEMO_GUIDE.md` note explicitement ce manque). `EmailService`/`EmailServiceImpl` (SMTP via `JavaMailSender`) pour le transactionnel (reset password, etc.).

### Backend
- **Entités nouvelles** :
  - `EmailCampaign` : `id, subject, html_body, status enum(DRAFT, SENDING, SENT, FAILED), filter_criteria jsonb (rôle/groupe/abonnés actifs), created_by, sent_at, recipient_count`.
  - `EmailCampaignRecipient` : `campaign_id, subscriber_id (FK NewsletterSubscriber, nullable) ou user_id (FK User, nullable), status enum(PENDING, SENT, FAILED), sent_at`.
- **Abstraction fournisseur** : interface `BulkEmailProvider` (`sendBulk(List<Recipient>, subject, body)`), implémentations `ResendProvider`, `BrevoProvider`, `PostmarkProvider` — un seul actif à la fois via `app.mail.campaign-provider=resend|brevo|postmark` (nouvelle propriété dans `EmailProperties`, même pattern `@ConfigurationProperties` que l'existant). **`EmailServiceImpl` (SMTP) reste tel quel pour le transactionnel** — ne pas migrer l'auth vers le nouveau provider dans ce lot, hors périmètre de la demande.
- **Appels HTTP fournisseur** : Spring 6 fournit déjà `RestClient` (inclus dans `spring-boot-starter-web`, présent) — **aucune nouvelle dépendance HTTP nécessaire**, sauf si les SDK officiels sont préférés (optionnel).
- **Envoi de masse** : `@EnableAsync` (config à ajouter, `spring-boot-starter` le permet nativement) + `ThreadPoolTaskExecutor` dédié (2–4 threads, pour respecter les limites de débit du fournisseur et ne pas saturer le VPS) + **file Redis** (`RPUSH campaign:{id}:queue`, consommée par un worker `@Async` qui `LPOP` par lots) — répond exactement à la demande "Redis + Spring Async".
- **Controller** : `EmailCampaignController` (`/api/admin/campaigns`) — CRUD brouillon, filtres, `POST /{id}/send` (déclenche l'envoi asynchrone), `GET /{id}/stats`.

### Frontend
`admin/campaigns/page.tsx` (nouveau) — éditeur de contenu (réutiliser Tiptap déjà en dépendance pour le corps HTML de la campagne, cohérent avec l'éditeur de leçons existant), formulaire de filtres, bouton d'envoi avec confirmation (action irréversible/visible par des tiers → mérite une confirmation explicite côté UI).

### DB
`V28__email_campaigns.sql` : `email_campaigns`, `email_campaign_recipients` (index `(campaign_id, status)`).

### Sécurité
`hasRole('ADMIN')` (envoi de masse = action sensible, plus stricte que la gestion de contenu classique `ADMIN|FORMATEUR`).

### Dépendance
`nl.martijndwars:web-push` déjà listée en §10 (push) ; ici, uniquement si les SDK officiels du fournisseur choisi sont préférés à `RestClient` — sinon **aucune nouvelle dépendance**.

---

## 13. Authentification

| Demandé | Statut |
|---|---|
| Réinitialisation mot de passe + token expirant | **Déjà fait** (`V11__auth_tokens.sql`, `AuthController.forgotPassword/resetPassword`) — rien à construire. |
| 2FA optionnel | **Nouveau** |
| Rôles SUPER_ADMIN / ADMIN | **Déjà en place** dans `Role` — aucun travail requis sauf décision produit de restreindre le 2FA à ces rôles. |

### Backend — 2FA (TOTP)
- **Choix technique** : implémenter TOTP (RFC 6238) **à la main** avec `javax.crypto.Mac`/`HmacSHA1` — **aucune nouvelle dépendance**, cohérent avec le style déjà présent dans le projet (`MediaService` signe déjà des URLs en HMAC-SHA256 à la main plutôt que via une lib). Alternative avec dépendance (`dev.samstevens.totp`) possible si l'équipe préfère ne pas maintenir ce bout de crypto.
- **`User`** : ajouter `totp_secret (VARCHAR, chiffré ou au minimum non exposé dans `UserResponse`), totp_enabled (boolean, défaut false)`.
- **`AuthService`** : `enableTotp()` (génère le secret, retourne un QR code — génération de QR code sans dépendance possible via une petite implémentation, ou dépendance légère `com.google.zxing:core` si le rendu doit être fiable visuellement), `verifyTotp(code)` appelé après le login mot de passe si `totp_enabled`.
- **`JwtService`/`SecurityConfig`** : un état intermédiaire "authentifié mais 2FA non validée" est nécessaire (ex. un cookie de session temporaire distinct du cookie JWT final, ou un JWT à portée réduite le temps de valider le TOTP) — point d'architecture à trancher avec l'équipe avant implémentation, car `SecurityConfig`/`JwtAuthenticationFilter` actuels supposent un seul cookie JWT = utilisateur pleinement authentifié.

### DB
`V29__totp.sql` : `ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255), ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;`

### Sécurité
Le secret TOTP ne doit **jamais** apparaître dans `UserResponse` (même vigilance que le mot de passe, déjà exclu). Limiter les tentatives de code TOTP via `RateLimitService` (même pattern que le login).

---

## 14. Classes virtuelles

### Backend
- **Entité `VirtualSession`** : `id, module_id (FK, nullable), group_id (FK LearnerGroup, nullable — session scoping à une cohorte), title, provider enum(ZOOM, GOOGLE_MEET, JITSI, OTHER), join_url, scheduled_at, duration_minutes, created_by`.
- **Approche budget maîtrisé recommandée** : stocker un **lien externe** créé manuellement par le formateur (Zoom/Meet/Jitsi), pas d'intégration API programmatique. Jitsi (`meet.jit.si`) ne nécessite aucune clé API et est gratuit — bon défaut pour un MVP. L'intégration API Zoom (création automatique de réunions) nécessite une app OAuth Zoom et certains paliers payants — à traiter comme évolution ultérieure, pas dans ce lot, cohérent avec l'esprit "bas budget" déjà établi pour les médias.
- **Calendrier** : étendre `AgendaService.myAgenda()` existant pour y agréger aussi les `VirtualSession` à venir de la cohorte de l'utilisateur (en plus de ce qu'il agrège déjà) — pas de nouveau système de calendrier.
- **Rappels automatiques** : `@Scheduled` (Spring natif, `@EnableScheduling` — aucune dépendance) vérifiant les sessions dans les prochaines 24h/1h, déclenchant `notificationService.notify(..., NotificationType.SESSION_REMINDER, ...)` + email (§10.1).

### Frontend
`admin/sessions/page.tsx` (création/liste, staff) + widget "Prochaine session" sur `app/app/page.tsx` (dashboard apprenant, à côté de la progression existante).

### DB
`V30__virtual_sessions.sql` : table `virtual_sessions`, index `(group_id, scheduled_at)`.

### Sécurité
Création = `hasAnyRole('ADMIN','FORMATEUR')`. Lecture = participants de la cohorte concernée (même logique de scoping que `GroupContentAssignment`).

---

## 15. PWA

### Frontend uniquement — aucun changement backend
- **Approche recommandée** : `manifest.json` + service worker **écrits à la main** plutôt que `next-pwa` — la génération automatique de `next-pwa` a des frictions connues avec l'App Router de Next.js 15, et le projet montre déjà une préférence pour des implémentations légères maison plutôt que des dépendances lourdes (HMAC signing, recommandation TOTP §13). **Aucune nouvelle dépendance**.
- **Cache** : stratégie *cache-first* pour l'app shell (assets statiques), *network-first* pour les appels API.
- **Limite à documenter clairement** : les URLs de médias sont signées avec une expiration (`MediaProperties.signedUrlTtlSeconds`, 1h par défaut) — un contenu mis en cache pour l'offline (vidéo/PDF déjà ouverts) cesse d'être rejouable via son URL signée après expiration, même si le fichier est physiquement dans le cache du navigateur, sauf à revalider l'URL en ligne avant chaque lecture. Pas un blocage, mais un vrai compromis à trancher avec le produit (offline complet vs URLs signées à durée de vie courte).
- **Notifications push** : le service worker enregistré ici est le même composant technique que celui nécessaire pour le Web Push (§10.1) — à développer ensemble.

---

## 16. Récapitulatif des migrations Flyway (ordre proposé)

| Fichier | Contenu |
|---|---|
| `V20__discussion_threads.sql` | Fils de discussion (réponses, épinglage, forum de module) |
| `V21__cohort_metadata.sql` | Code/dates/mode de promo sur `learner_groups` |
| `V22__assignments_gradebook.sql` | `assignments`, `submissions`, `grade_adjustments` |
| `V23__question_types.sql` | `questions.metadata`, `essay_grades`, statut `PENDING_REVIEW` |
| `V24__question_bank.sql` | `question_banks`, `questions.question_bank_id` |
| `V25__proctoring.sql` | Options anti-triche par quiz + `proctoring_events` |
| `V26__time_tracking.sql` | `time_tracking_logs` |
| `V27__notifications_messaging.sql` | `push_subscriptions`, `conversations`, `messages` |
| `V28__email_campaigns.sql` | `email_campaigns`, `email_campaign_recipients` |
| `V29__totp.sql` | 2FA sur `users` |
| `V30__virtual_sessions.sql` | Classes virtuelles |

Aucune migration nécessaire pour : gamification (extension d'enum), notifications (extension d'enum), agenda (lecture seule sur données existantes), PWA (frontend seul).

---

## 17. Dépendances à ajouter — vue consolidée

| Dépendance | Pour | Obligatoire ? |
|---|---|---|
| `nl.martijndwars:web-push` (ou équivalent) | Web Push (§10.1) | Oui, si push activé |
| `com.google.zxing:core` | QR code d'activation TOTP (§13) | Optionnel — un rendu texte du secret suffit en dépannage |
| SDK officiel Resend/Brevo/Postmark | Campagnes email (§12) | Non — `RestClient` (déjà présent) suffit |
| `dev.samstevens.totp` | Alternative à un TOTP fait maison (§13) | Non recommandé — préférer l'implémentation maison, cohérente avec le style HMAC déjà en place |
| `spring-boot-starter-websocket` | Messagerie temps réel (§10.2) | Non pour la Phase 1 (polling) — à évaluer en Phase 2 |
| `recharts` (frontend) | Graphiques analytics plus riches (§9) | Non pour un MVP — CSS/SVG simple suffit |

**Toutes les autres fonctionnalités (forums, cohortes, gradebook, question bank, anti-triche, gamification, agenda, PWA) ne nécessitent aucune nouvelle dépendance** — elles s'appuient sur Spring Data JPA, Redis, `poi-ooxml`, `openpdf`, Tiptap, `hls.js` déjà présents.

---

## 18. Roadmap — ordre d'implémentation logique

L'ordre suit les dépendances techniques réelles entre lots (pas la liste de la demande) : les fondations de données d'abord, puis ce qui s'appuie dessus.

1. **Nouveaux types de questions + Question Bank** (§6, §7) — étend `Question`/`QuizAttempt`, brique la plus centrale, tout le reste du quiz en dépend (correction manuelle, anti-triche s'y raccrochent).
2. **Correction manuelle** (§5) — dépend directement de (1) pour le type `ESSAY`.
3. **Forums de discussion** (§2) — indépendant, extension isolée de `LessonComment`, bon lot "rapide" à livrer tôt.
4. **Cohortes — métadonnées de promo** (§3) — extension mineure de `LearnerGroup`, déjà 90% construit.
5. **Devoirs + Gradebook** (§4) — dépend de (2) pour agréger aussi les notes de quiz corrigées.
6. **Analytics & Tracking** (§9) — dépend d'avoir des cohortes stables (4) pour les rapports par promo.
7. **Notifications (email) + Gamification (extension)** (§10.1, §11) — additifs, faible risque, peuvent être livrés en parallèle de (6).
8. **Anti-triche** (§8) — après (1), fonctionnalité optionnelle/togglable, pas bloquante pour le reste.
9. **Messagerie** (§10.2) — nouveau sous-système, à isoler une fois les briques précédentes stabilisées.
10. **Back-office Email/Campagnes** (§12) — indépendant du reste, mais nécessite une décision produit (fournisseur) avant de démarrer.
11. **Classes virtuelles** (§14) — dépend des cohortes (4) pour le scoping, de l'agenda existant.
12. **2FA** (§13) — isolé, mais touche `SecurityConfig`/`JwtAuthenticationFilter` (zone sensible) : à traiter en dernier avec la plus grande prudence, tests de non-régression sur l'auth existante obligatoires.
13. **PWA + Web Push** (§15, §10.1 partie push) — dernier, car il consomme le travail de notifications (7) et n'a aucune dépendance entrante d'autres lots.

---

## 19. Risques transverses à surveiller

- **`QuizAttempt.answers` généralisé en `Map<String,Object>`** (§6) touche le cœur du moteur de scoring déjà en production (module 1/2 déjà utilisés en démo) — prévoir une migration de données pour les tentatives existantes (les valeurs actuelles, `List<String>`, restent valides sous le type élargi, donc pas de backfill nécessaire, mais à vérifier par un test de non-régression sur `QuizService`).
- **2FA (§13)** est la seule fonctionnalité qui touche `SecurityConfig`/`JwtAuthenticationFilter" directement — zone la plus sensible du projet (authentification en production). À isoler dans son propre lot, jamais mélangée à un autre changement.
- **Question Bank (§7)** relâche `questions.quiz_id` en nullable — vérifier qu'aucune requête existante (`QuestionRepository`, `QuizService`) ne suppose implicitement `quiz_id NOT NULL` avant de livrer.
- **Tracking temps réel (§9.1)** est la seule fonctionnalité à fort volume d'écriture de tout ce plan — l'agrégation Redis avant flush SQL n'est pas optionnelle, un flush ligne-par-ligne dégraderait rapidement les performances de la base au fil du temps.
