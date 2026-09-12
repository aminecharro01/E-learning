# IAT Academy — analyse détaillée du backend

> Ce document décrit le backend Spring Boot d'IAT Academy en profondeur :
> architecture, packages, contrôleurs, services, repositories, entités,
> DTO, exceptions, sécurité, transactions, migrations. Toute affirmation
> ci-dessous est vérifiable directement dans le code source
> (`backend/src/main/java/ma/iatacademy/api/`) — chaque chiffre a été
> compté sur le dépôt réel au moment de la rédaction, chaque extrait de
> code est copié tel quel du fichier cité.

## 0. Chiffres clés (comptés sur le dépôt)

| Élément | Chiffre réel |
|---|---|
| Contrôleurs (`controller/*.java`) | **31** |
| Services (`service/*.java`) | **46** |
| Repositories (`repository/*.java`) | **38** |
| Fichiers entités (`domain/entity/*.java`) | **40**, dont **39** portent `@Entity` (le 40ᵉ, `AuditableEntity`, est une classe `@MappedSuperclass`) |
| Enums métier (`domain/enums/*.java`) | **22** |
| Fichiers DTO (`dto/**/*.java`) | **138**, répartis en 26 sous-dossiers par fonctionnalité + 14 DTO racine (auth/profil) |
| Classes de configuration (`config/*.java`) | **17** |
| Classes d'exception (`exception/*.java`) | **8** |
| Classes de sécurité (`security/*.java`) | **5** |
| Migrations Flyway (`db/migration/*.sql`) | **45** (V1 à V45) |
| Services avec au moins une méthode `@Transactional` | **37** sur 46 |

## 1. Architecture en couches : Controller → Service → Repository → Entity

Le backend applique une séparation stricte en quatre couches, documentée
comme règle de développement du projet (voir `CLAUDE.md` à la racine) :

> `@RestController` → `@Service` → `@Repository` layering is deliberate
> and consistently thin at the controller level: controllers only do path
> mapping, `@PreAuthorize`, request/response translation, and delegate to
> exactly one service call. Business logic belongs in services — don't
> let it leak into controllers.

Concrètement :

- **Controller** (`controller/`) : mapping HTTP (`@GetMapping`, etc.),
  annotation `@PreAuthorize` pour le contrôle de rôle, validation d'entrée
  (`@Valid`), et un **unique appel** à une méthode de service. Aucune
  logique métier, aucun accès direct à un repository.
- **Service** (`service/`) : logique métier, orchestration entre
  plusieurs repositories, gestion des transactions (`@Transactional`),
  levée des exceptions métier.
- **Repository** (`repository/`) : interfaces Spring Data JPA, aucune
  logique — uniquement des méthodes dérivées ou des requêtes `@Query`.
- **Entity** (`domain/entity/`) : mapping objet-relationnel JPA/Hibernate,
  aucune logique métier significative (uniquement des invariants
  triviaux via `@PrePersist`/`@PreUpdate` sur `AuditableEntity`).

Ce découpage a un intérêt concret vérifiable dans le code : un contrôleur
comme `StageController` (section 3) reste lisible malgré 9 endpoints
différents, parce que toute la complexité (vérification de rôle
supplémentaire, coordination entre `UfValidationService` et
`ProgressionService`, notifications, badges) est déportée dans les
services. Inversement, un service comme `ProgressionService` (326 lignes,
section 4) concentre une logique de déblocage séquentiel complexe sans
qu'aucun contrôleur n'ait à la connaître.

## 2. Organisation des packages

Arborescence réelle sous `backend/src/main/java/ma/iatacademy/api/` :

```
controller/     31 fichiers — un contrôleur REST par domaine fonctionnel
service/        46 fichiers — logique métier, un service par domaine (parfois plus fin, ex. BadgeImageService à côté de BadgeService)
repository/     38 fichiers — interfaces Spring Data JPA
domain/
  entity/       40 fichiers (39 @Entity + AuditableEntity)
  enums/        22 enums métier (Role, BadgeCode, QuestionType, AttemptStatus, ...)
dto/            138 fichiers, organisés par sous-dossier fonctionnel :
  admin/ agenda/ analytics/ assignment/ assistant/ badge/ campaign/
  catalog/ certificate/ comment/ common/ gradebook/ group/ job/ lesson/
  media/ messaging/ note/ notification/ proctoring/ progress/
  publicapi/ quiz/ search/ session/ stage/
  + 14 DTO d'authentification/profil directement sous dto/ (LoginRequest,
  RegisterRequest, UserResponse, ChangePasswordRequest, ...)
config/         17 fichiers — SecurityConfig, AiProviderProperties, JwtProperties, CorsProperties, ...
exception/      8 fichiers — ApiException, NotFoundException, ForbiddenException,
                GoneException, LessonLockedException, RateLimitException,
                TotpRequiredException, GlobalExceptionHandler
security/       5 fichiers — JwtService, JwtAuthenticationFilter,
                CustomUserDetailsService, UserPrincipal, TotpService
```

Le nommage des DTO suit une convention stricte : un fichier = un record =
une forme de requête/réponse (`ValidateUfRequest`, `UfValidationResponse`,
jamais une classe partagée entre plusieurs endpoints avec des champs
optionnels selon le contexte).

## 3. Contrôleurs — cinq exemples représentatifs

### 3.1 `PublicBadgeController` — le contrôleur le plus simple, endpoint public

```java
// backend/src/main/java/ma/iatacademy/api/controller/PublicBadgeController.java
@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class PublicBadgeController {

    private final BadgeService badgeService;
    private final BadgeImageService badgeImageService;

    @GetMapping("/verify/{code}")
    public ResponseEntity<PublicBadgeResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(badgeService.getPublicBadge(code));
    }

    @GetMapping(value = "/verify/{code}/image.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> image(@PathVariable String code) {
        UserBadge userBadge = badgeService.getByShareCode(code);
        User learner = userBadge.getUser();
        String learnerName = learner.getFullName() != null ? learner.getFullName() : learner.getEmail();
        Path path = badgeImageService.getOrGenerateImage(userBadge, learnerName);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                .body(new FileSystemResource(path));
    }
}
```

Ce contrôleur n'a **aucune** annotation `@PreAuthorize` : les deux routes
sont volontairement publiques (page de partage d'un badge, consultable
par un tiers non authentifié — par exemple le crawler d'aperçu Open Graph
de LinkedIn). Le commentaire de classe l'explicite : « même principe non
authentifié que `CertificateController#verify` ». La route est d'ailleurs
listée explicitement dans `SecurityConfig.publicPaths`
(`"/api/badges/verify/**"`) — la sécurité applicative ne repose donc pas
sur l'absence de `@PreAuthorize` seule, mais sur une liste blanche
explicite au niveau du filtre de sécurité. Chaque méthode ne fait qu'un
appel de service (`badgeService.getPublicBadge`,
`badgeService.getByShareCode` + `badgeImageService.getOrGenerateImage`) et
traduit le résultat en `ResponseEntity`.

### 3.2 `StageController` — délégation à quatre services différents

```java
// backend/src/main/java/ma/iatacademy/api/controller/StageController.java (extrait)
@RestController
@RequestMapping("/api/stage")
@RequiredArgsConstructor
public class StageController {

    private final StageService stageService;
    private final UfValidationService ufValidationService;
    private final StageSignoffService stageSignoffService;
    private final ProgressionService progressionService;

    @PostMapping("/learners/{learnerId}/uf-validations")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
    public ResponseEntity<UfValidationResponse> validateUf(
            @PathVariable UUID learnerId,
            @Valid @RequestBody ValidateUfRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UfValidationResponse response = ufValidationService.validate(learnerId, request, principal);
        progressionService.checkAndAwardYearBadges(learnerId);
        return ResponseEntity.ok(response);
    }
}
```

Point notable : cet endpoint (analysé en détail section 20) fait
exceptionnellement **deux** appels de service à la suite plutôt qu'un
seul. C'est un choix assumé plutôt qu'une fuite de logique métier : le
premier appel (`ufValidationService.validate`) enregistre la validation
elle-même ; le second (`progressionService.checkAndAwardYearBadges`)
déclenche une vérification transverse (l'année scolaire est-elle
désormais complète ?) qui concerne un domaine distinct (les badges de
progression), volontairement séparé dans un service différent plutôt que
mélangé dans `UfValidationService`. Aucune des deux méthodes de service
n'écrit de logique conditionnelle propre au contrôleur : le contrôleur se
contente d'enchaîner deux opérations et de renvoyer le résultat de la
première.

Autre détail visible dans le fichier complet : la méthode `ufValidations`
(liste 88-98) contient une vérification d'appartenance
(`principal.getId().equals(learnerId)`) directement dans le contrôleur —
une des rares dérogations à la règle « aucune logique dans le
contrôleur », justifiée ici par le fait qu'il s'agit d'un contrôle
d'accès (pas d'une règle métier) trop simple pour justifier un aller-retour
en service.

### 3.3 `QuizController` — le plus gros contrôleur (20 endpoints), mix apprenant/staff

`QuizController` regroupe des routes accessibles à tout utilisateur
authentifié (`start`, `submit`, `attempts`) et des routes réservées au
staff (`create`, `addQuestion`, `generateQuestionsAi`), chacune annotée
individuellement :

```java
@PostMapping("/{id}/start")
public ResponseEntity<QuizStartResponse> start(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserPrincipal principal
) {
    return ResponseEntity.ok(quizService.start(id, principal));
}

@PostMapping("/{id}/questions/generate-ai")
@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
public ResponseEntity<AiGenerationResponse> generateQuestionsAi(
        @PathVariable UUID id,
        @Valid @RequestBody AiGenerationRequest request,
        @AuthenticationPrincipal UserPrincipal principal
) {
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(quizService.generateQuestionsAi(id, request, principal.getId()));
}
```

Chaque méthode reste une ligne de délégation, malgré la variété des cas
(démarrage de tentative, soumission, notation manuelle d'une question
ouverte via `gradeEssay`, télémétrie anti-triche via
`recordProctoringEvent`). Toute la complexité — y compris le
verrouillage de concurrence sur `start` (section 14) — vit dans
`QuizService`/`QuizAttemptService`, jamais dans le contrôleur.

### 3.4 `AdminController` — hiérarchie de rôles fine, un service par sous-domaine

```java
// backend/src/main/java/ma/iatacademy/api/controller/AdminController.java (extrait)
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final QuizSettingsService quizSettingsService;
    private final AppSettingsService appSettingsService;
    private final PublicLeadService publicLeadService;
    private final AuditLogService auditLogService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','FORMATEUR','SUPPORT')")
    public ResponseEntity<AdminStatsResponse> stats() {
        return ResponseEntity.ok(adminService.stats());
    }

    @GetMapping("/settings/app")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AppSettingsResponse> getAppSettings() {
        return ResponseEntity.ok(appSettingsService.get());
    }
}
```

Ce contrôleur illustre la granularité réelle des rôles : `/stats` est
lisible par `ADMIN`, `FORMATEUR` **et** `SUPPORT` (lecture seule), tandis
que `/settings/app` (paramètres système globaux) est réservé à
`SUPER_ADMIN` seul — ni `ADMIN` ni `FORMATEUR` n'y ont accès malgré la
hiérarchie de rôles (section 17), qui ne joue que dans un sens
(`SUPER_ADMIN` hérite des droits `ADMIN`, jamais l'inverse). `AdminController`
n'injecte pas moins de cinq services différents, chacun responsable d'un
sous-domaine (statistiques, réglages quiz, réglages globaux, leads
publics, journal d'audit) — le contrôleur reste un simple routeur qui ne
connaît que les signatures de ces services, jamais leur implémentation.

### 3.5 `MessagingController` — délégation avec vérification d'appartenance en service

Non reproduit intégralement ici (voir section 4.4 pour la logique), mais
son schéma est identique : chaque route (`GET /api/messaging/conversations`,
`POST /api/messaging/conversations/{id}/messages`, ...) délègue à
`MessagingService`, qui est seul responsable de vérifier
qu'un utilisateur a le droit d'accéder à une conversation donnée
(`MessagingService#assertAccess`, section 4.4) — jamais le contrôleur.

## 4. Services — quatre exemples de logique métier réelle

### 4.1 `ProgressionService` — la pièce la plus complexe du backend (369 lignes)

Ce service implémente le déblocage séquentiel du contenu pédagogique par
UF (unité de formation), avec une règle particulière : deux UF (« UF 5 »
Stage et « UF 11 » Soutenance) nécessitent une **validation humaine du
directeur** en plus des critères automatiques. Extrait de la logique
d'accès à un module :

```java
// backend/src/main/java/ma/iatacademy/api/service/ProgressionService.java
@Transactional
public boolean isModuleAccessible(UUID userId, ModuleEntity module) {
    // Apprenant hybride (rattaché à un groupe) : aucun déblocage automatique.
    User learner = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
    if (learner.getGroup() != null) {
        return assignmentRepository.isUnlocked(
                learner.getGroup().getId(), module.getId(), Instant.now());
    }

    int year = yearOf(module);
    if (year >= 2) {
        ensureYear2AccessIfEligible(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (!user.isYear2AccessEnabled()) {
            return false;
        }
    }
    // ... comparaison de position dans l'ordre des UF de l'année
}
```

Deux parcours d'accès distincts cohabitent dans une seule méthode :
- un apprenant **rattaché à un groupe** (présentiel/hybride) ne suit
  aucune règle de progression automatique — son accès dépend uniquement
  des affectations manuelles du directeur (`GroupContentAssignmentRepository`) ;
- un apprenant **100% en ligne** suit la règle séquentielle classique :
  UF par UF, avec ouverture de l'année 2 conditionnée à une date de
  rentrée paramétrable (`AppSettingsService`) et à la complétion de
  l'année 1.

La méthode `isUfFullyDone` (appelée en cascade par `isYear1FullyDone` /
`isYear2FullyDone`) combine trois conditions : contenu terminé
(`isModuleContentCompleted`), quiz de fin d'UF réussi si un tel quiz
existe (`isUfQuizPassed`), et validation humaine si l'UF en fait partie
(`ufValidationService.isValidated`) — chaque condition déléguée à un
repository ou service dédié, jamais recalculée sur place.

`checkAndAwardYearBadges` (appelée par `StageController#validateUf`,
section 20, et par `updateLessonProgress` lui-même) est explicitement
documentée comme idempotente : « sûr à appeler même quand l'année n'est
pas encore terminée », grâce à `BadgeService#awardIfAbsent` qui ne fait
rien si le badge existe déjà.

### 4.2 `QuestionGenerationService` — intégration IA avec repli Gemini → Grok

```java
// backend/src/main/java/ma/iatacademy/api/service/QuestionGenerationService.java
public List<CreateQuestionRequest> generate(String sourceText, QuestionType type, int count) {
    boolean geminiConfigured = properties.getGemini().isConfigured();
    boolean grokConfigured = properties.getGrok().isConfigured();
    if (!geminiConfigured && !grokConfigured) {
        throw new ApiException("Génération IA indisponible : aucune clé API Gemini ou Grok configurée.");
    }
    String prompt = buildPrompt(sourceText, type, count);
    if (geminiConfigured) {
        try {
            return parseQuestions(callGemini(prompt), type);
        } catch (Exception e) {
            log.warn("Génération Gemini échouée, repli sur Grok si configuré : {}", e.getMessage());
        }
    }
    if (grokConfigured) {
        try {
            return parseQuestions(callGrok(prompt), type);
        } catch (Exception e) {
            log.warn("Génération Grok échouée : {}", e.getMessage());
        }
    }
    throw new ApiException("Génération IA indisponible pour le moment (Gemini et Grok ont échoué).");
}

// Package-private (not private) so tests can Mockito.spy() and stub the network call
// without exercising real HTTP — see QuestionGenerationServiceTest.
String callGemini(String prompt) { /* ... appel RestClient vers generativelanguage.googleapis.com ... */ }
String callGrok(String prompt) { /* ... appel RestClient vers api.x.ai ... */ }
```

Ce service ne persiste **rien** lui-même : il renvoie une liste de
`CreateQuestionRequest`, que `QuizService` valide et sauvegarde ensuite
via le même chemin qu'une question saisie manuellement — garantissant
les mêmes invariants (options, type de question, etc.) qu'une saisie
humaine. La configuration d'un fournisseur ne dépend pas d'un booléen
« activé » séparé mais uniquement d'une clé API non vide
(`AiProviderProperties.Gemini#isConfigured`), et les méthodes d'appel
réseau (`callGemini`/`callGrok`) sont délibérément package-private (pas
`private`) pour permettre à `QuestionGenerationServiceTest` de les
`spy()` avec Mockito sans jamais toucher le réseau — un pattern répété
dans `CourseAssistantService` (`.ask()`, `.callGemini()`, `.callGrok()`
aux lignes 226/243 de ce dernier).

### 4.3 `BadgeService` — idempotence et gestion explicite du lazy-loading

```java
// backend/src/main/java/ma/iatacademy/api/service/BadgeService.java
@Transactional
public void awardIfAbsent(User user, BadgeCode code) {
    if (userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), code)) {
        return;
    }
    userBadgeRepository.save(UserBadge.builder()
            .user(user)
            .badgeCode(code)
            .awardedAt(Instant.now())
            .shareCode(generateShareCode())
            .build());
    notificationService.notify(user, NotificationType.BADGE_EARNED,
            "Badge débloqué : " + code.getLabel(), code.getDescription(), "/app/profile");
}

/** Initialise le proxy User avant de renvoyer l'entité : PublicBadgeController#image
 *  y accède après la fin de cette transaction (open-in-view désactivé, voir
 *  application.yml), donc un accès paresseux non résolu ici y lèverait
 *  LazyInitializationException. */
@Transactional(readOnly = true)
public UserBadge getByShareCode(String shareCode) {
    UserBadge userBadge = userBadgeRepository.findByShareCode(shareCode)
            .orElseThrow(() -> new NotFoundException("Code de badge invalide."));
    org.hibernate.Hibernate.initialize(userBadge.getUser());
    return userBadge;
}
```

Deux points de conception réels à noter : (1) `awardIfAbsent` est conçue
pour être appelée depuis n'importe quelle mutation affectant la
progression (leçon terminée, UF validée, ...) sans jamais produire de
doublon — le check d'existence précède l'écriture dans la même
transaction ; (2) `getByShareCode` appelle explicitement
`Hibernate.initialize()` sur l'association paresseuse `user` parce que
`spring.jpa.open-in-view: false` (vérifié dans
`backend/src/main/resources/application.yml`, ligne 11) ferme la session
Hibernate à la sortie de la méthode transactionnelle — sans cet appel,
`PublicBadgeController#image` (section 3.1), qui accède à
`userBadge.getUser()` après le retour du service, lèverait une
`LazyInitializationException`.

### 4.4 `MessagingService` — contrôle d'accès centralisé (`assertAccess`)

```java
// backend/src/main/java/ma/iatacademy/api/service/MessagingService.java
private void assertAccess(UUID conversationId, UserPrincipal principal) {
    Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new NotFoundException("Conversation introuvable."));
    if (conversation.getType() == ConversationType.COHORT_ROOM) {
        if (principal.getRole().isStaff()) return;
        User user = userRepository.findById(principal.getId()).orElse(null);
        boolean member = user != null && user.getGroup() != null
                && conversation.getGroup() != null && user.getGroup().getId().equals(conversation.getGroup().getId());
        if (!member) throw new ForbiddenException("Vous n'appartenez pas à cette cohorte.");
        return;
    }
    participantRepository.findByConversationIdAndUserId(conversationId, principal.getId())
            .orElseThrow(() -> new ForbiddenException("Cette conversation ne vous appartient pas."));
}
```

C'est l'exemple cité par `CLAUDE.md` comme référence de contrôle d'accès
au niveau service (à côté de `NotificationService#markRead`) : le
contrôleur ne fait *aucune* vérification d'appartenance à la
conversation — c'est `assertAccess`, appelée en préambule de toute
méthode manipulant une conversation, qui distingue deux cas (salon de
cohorte vs conversation directe) et lève une `ForbiddenException` plutôt
que de laisser fuiter des messages d'une conversation à laquelle
l'utilisateur n'appartient pas. Autre détail réel du fichier : le rôle
`SUPPORT` n'est pas « staff » au sens de `isStaff()`, mais reste
contactable en direct — géré par une méthode dédiée
`isMessagingEligible(Role role)` distincte de `isStaff()`.

## 5. Repositories — pattern Spring Data JPA

Les 38 repositories sont tous de simples interfaces étendant
`JpaRepository<Entity, UUID>`, sans implémentation. Deux styles de
requêtes cohabitent : les méthodes dérivées (nommage Spring Data) et les
requêtes explicites `@Query` quand la requête dérivée serait trop
complexe ou nécessite un agrégat.

Exemple de méthodes dérivées (`UserRepository`) :

```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findByGroupIdOrderByFullNameAsc(UUID groupId);
    Page<User> findByRole(Role role, Pageable pageable);
    long countByRoleAndEnabledTrue(Role role);
}
```

Exemple de requête JPQL explicite avec recherche insensible à la casse
(même fichier) :

```java
@Query("""
        SELECT u FROM User u
        WHERE u.role = :role
          AND (
            LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
            OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
          )
        """)
Page<User> searchByRoleAndQuery(@Param("role") Role role, @Param("q") String q, Pageable pageable);
```

Exemple de requête d'agrégat (`QuizAttemptRepository`) :

```java
/** Classement de cohorte : score moyen par apprenant, meilleures tentatives uniquement. */
@Query("SELECT a.user.id, AVG(a.score) FROM QuizAttempt a "
        + "WHERE a.user.group.id = :groupId AND a.status IN :statuses AND a.score IS NOT NULL "
        + "GROUP BY a.user.id")
List<Object[]> averageScoreByGroupGroupedByUser(@Param("groupId") UUID groupId, @Param("statuses") List<AttemptStatus> statuses);
```

Enfin, `QuizAttemptRepository` contient une requête **native SQL**
utilisée uniquement comme verrou de concurrence (détaillée section 14) :

```java
@org.springframework.data.jpa.repository.Query(
        value = "SELECT pg_advisory_xact_lock(hashtext(:lockKey))", nativeQuery = true)
void acquireStartLock(@org.springframework.data.repository.query.Param("lockKey") String lockKey);
```

## 6. Entities — 39 entités JPA, base commune `AuditableEntity`

Les 39 classes annotées `@Entity` couvrent les domaines suivants (liste
non exhaustive, orientée par les noms de fichiers réels) : identité
(`User`, `LearnerGroup`), pédagogie (`Formation`, `ModuleEntity`,
`Lesson`, `LessonBlock`, `LessonProgress`), évaluation (`Quiz`,
`Question`, `QuizAttempt`, `Submission`, `Assignment`), stage
(`LearnerUfValidation`, `StageSignoffInvite`, documents), messagerie
(`Conversation`, `ConversationParticipant`, `Message`), notifications et
badges (`Notification`, `UserBadge`), audit (`AuditLog`), campagnes email
(`EmailCampaign`), certificats (`Certificate`), et suivi (`TimeTrackingLog`,
`VirtualSession`).

Toutes héritent de `AuditableEntity`, une classe `@MappedSuperclass` (pas
`@Entity` — elle ne correspond à aucune table propre, ses colonnes sont
répercutées dans chaque table fille) qui centralise l'horodatage :

```java
// backend/src/main/java/ma/iatacademy/api/domain/entity/AuditableEntity.java
@Getter
@Setter
@MappedSuperclass
public abstract class AuditableEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
```

`@PrePersist`/`@PreUpdate` sont des callbacks du cycle de vie JPA
déclenchés automatiquement par Hibernate juste avant l'insertion / la
mise à jour — aucun service n'a besoin de renseigner `createdAt` ou
`updatedAt` manuellement.

## 7. DTO — records Java, un fichier = une forme

Aucun DTO du projet n'est une classe mutable : tous sont des `record`
Java, immuables par construction, avec validation Bean Validation portée
directement sur les composants du record. Exemple de requête
(`ValidateUfRequest`) :

```java
// backend/src/main/java/ma/iatacademy/api/dto/stage/ValidateUfRequest.java
public record ValidateUfRequest(
        @NotBlank String ufCode,
        @NotNull Boolean validated,
        String note
) {
}
```

Et la réponse correspondante (`UfValidationResponse`) :

```java
// backend/src/main/java/ma/iatacademy/api/dto/stage/UfValidationResponse.java
public record UfValidationResponse(
        String ufCode,
        boolean validated,
        Instant validatedAt,
        String validatedByName,
        String note
) {
}
```

Notez que `validated` est un `Boolean` (wrapper) dans la requête — pour
que `@NotNull` puisse détecter une valeur absente du JSON — mais un
`boolean` primitif dans la réponse, où l'absence n'a pas de sens. Un DTO
de réponse volumineux existe pour illustrer la richesse possible d'un
record (`UserResponse`, 27 composants) — mélange de champs de profil, de
statut de paiement, de préférences et d'identifiants dérivés
(`groupId`, `groupName`), tous remplis à la main dans
`AuthService.toResponse` (section 8).

## 8. Mappers — aucun MapStruct, mapping manuel dans les services

Le projet **n'utilise pas MapStruct** (aucune dépendance dans
`backend/pom.xml`, aucune annotation `@Mapper` dans le code — vérifié par
recherche). Le mapping entité → DTO est fait à la main, généralement via
une méthode privée ou statique nommée `toResponse` à l'intérieur du
service concerné. Exemple dans `UfValidationService` :

```java
private UfValidationResponse toResponse(LearnerUfValidation row) {
    String by = null;
    if (row.getValidatedBy() != null) {
        by = row.getValidatedBy().getFullName() != null
                ? row.getValidatedBy().getFullName()
                : row.getValidatedBy().getEmail();
    }
    return new UfValidationResponse(
            row.getUfCode(), row.isValidated(), row.getValidatedAt(), by, row.getNote());
}
```

Ce choix a un coût (du code répétitif entre services proches) mais un
avantage direct : la logique de repli (« nom complet sinon email ») ou de
formatage n'est jamais générique — elle est écrite explicitement à
l'endroit où elle a un sens métier, sans dépendre d'une configuration
d'annotation externe à apprendre pour un jury ou un repreneur du projet.

## 9. Exceptions — `GlobalExceptionHandler` et le correctif `/actuator/health`

Le package `exception/` définit 7 exceptions métier
(`ApiException`, `NotFoundException`, `ForbiddenException`, `GoneException`,
`LessonLockedException`, `RateLimitException`, `TotpRequiredException`)
et un unique point de capture centralisé,
`GlobalExceptionHandler`, annoté `@RestControllerAdvice` : toute
exception levée dans n'importe quel contrôleur ou service remonte ici et
est traduite en réponse JSON structurée (`timestamp`, `status`, `error`).

Le handler le plus récemment ajouté (commit `5a4b4d2`, message :
« Corrige /actuator/health : 500 au lieu de 404 ») cible
`NoResourceFoundException` :

```java
/**
 * Thrown by Spring MVC for any URL that resolves to neither a mapped endpoint nor a
 * static resource (a mistyped API path, /actuator/health before the actuator starter
 * was added...). Without this it fell through to handleGeneric() and came back as a
 * 500 "erreur inattendue", which is misleading for what is really just a 404.
 */
@ExceptionHandler(NoResourceFoundException.class)
public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException ex) {
    return build(HttpStatus.NOT_FOUND, "Ressource introuvable.");
}
```

Le problème d'origine, décrit dans le message de commit : `/actuator/health`
était déjà listé comme public dans `SecurityConfig`, mais
`spring-boot-starter-actuator` n'avait jamais été ajouté au classpath —
la requête tombait donc sur la résolution de ressource statique de
Spring MVC, qui levait `NoResourceFoundException`, capturée jusque-là par
le handler générique `Exception.class` et transformée en 500 au lieu
d'un 404 propre. Le correctif a trois volets, tous vérifiables dans le
commit : ajout du starter Actuator (`backend/pom.xml`), exposition
uniquement de `/actuator/health` (aucune autre route Actuator, jamais le
détail des composants à un appelant non authentifié), et ajout de ce
handler dédié — qui corrige non seulement `/actuator/health` mais
**toute** ressource réellement introuvable (le commit cite
`/documents/fichier-inexistant.pdf` comme second cas vérifié en
conditions réelles).

D'autres handlers du même fichier illustrent la même discipline
(traduire une exception technique en réponse HTTP correcte plutôt que de
laisser fuiter un 500) :

- `AccessDeniedException` (levée par `@PreAuthorize` en échec) → 403,
  avec un commentaire explicite : sans ce handler, la vérification de
  rôle échouée remontait en 500, masquant de vraies erreurs serveur dans
  les logs et cassant la gestion dédiée du frontend pour le 403.
- `ClientAbortException` (déconnexion client en cours de streaming vidéo)
  → aucune réponse écrite du tout (juste un log en `debug`), car les
  en-têtes de la réponse sont déjà envoyés — écrire un corps JSON dessus
  provoquait une erreur secondaire Jackson qui masquait la cause réelle.
- `Exception.class` (fourre-tout final) → 500 générique en français,
  **sans jamais renvoyer `ex.getMessage()`** : le commentaire du code est
  explicite sur le risque (un message JDBC brut, en anglais, nommant
  parfois des colonnes de table internes, n'est pas destinable à un
  apprenant).

## 10. Validation — Bean Validation systématique sur les DTO d'entrée

Chaque endpoint qui reçoit un corps de requête modifiable l'annote
`@Valid @RequestBody <Type>`, et le DTO porte les contraintes
(`@NotBlank`, `@NotNull`, potentiellement d'autres contraintes Jakarta
Validation selon le champ). Exemple déjà vu (`ValidateUfRequest`) :
`@NotBlank String ufCode`, `@NotNull Boolean validated`. Une violation
déclenche une `MethodArgumentNotValidException`, capturée par
`GlobalExceptionHandler#handleValidation`, qui construit une réponse 400
listant précisément les champs en échec (`Map<String, String> fields`,
un message par champ) — jamais un message générique.

## 11. Configurations (`config/`, 17 classes)

Les classes les plus significatives :

- `SecurityConfig` — chaîne de filtres, liste blanche publique, CORS,
  hiérarchie de rôles (détaillé sections 16-17).
- `AiProviderProperties` — configuration Gemini/Grok (section 4.2).
- `JwtProperties` — secret, durée d'expiration, nom du cookie, drapeau
  `cookieSecure`.
- `CorsProperties` — origines autorisées, injectées dans
  `SecurityConfig#corsConfigurationSource`.
- `DemoDataSeeder` — jeu de données de démonstration au démarrage.
- `QuizProperties` — seuils de complétion (ex. pourcentage de vidéo
  regardée requis, utilisé dans `ProgressionService#updateLessonProgress`).

## 12. API REST — conventions réelles

Toutes les routes sont préfixées `/api/...`, à l'exception des documents
statiques (`/documents/**`) et des routes Actuator (`/actuator/health`
uniquement). Les méthodes HTTP utilisées suivent une convention REST
classique observée à travers les contrôleurs lus :

| Méthode | Usage réel observé |
|---|---|
| `GET` | Lecture (listes, détail, recherche paginée) |
| `POST` | Création (`POST /api/quiz`), actions non idempotentes (`POST /{id}/start`, `POST /{id}/submit`) |
| `PUT` | Remplacement complet (`PUT /api/quiz/{id}`, `PUT /api/quiz/{id}/questions/{questionId}`) |
| `PATCH` | Mise à jour partielle (`PATCH /api/admin/users/{id}/role`, `PATCH /api/quiz/attempts/{attemptId}/questions/{questionId}/grade`) |
| `DELETE` | Suppression (`DELETE /api/quiz/{id}`, `DELETE /api/stage/documents/{documentId}`) |

Les réponses vides utilisent `ResponseEntity.noContent().build()` (204),
les créations `HttpStatus.CREATED` (201) explicite, jamais un simple 200
par défaut pour une création.

## 13. Relations JPA — exemples réels

`@ManyToOne` (relation obligatoire, `LearnerUfValidation` → `User`) :

```java
// backend/src/main/java/ma/iatacademy/api/domain/entity/LearnerUfValidation.java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "learner_id", nullable = false)
private User learner;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "validated_by")
private User validatedBy;
```

`@OneToMany` avec cascade et suppression orpheline (`ModuleEntity` →
`Lesson`) :

```java
// backend/src/main/java/ma/iatacademy/api/domain/entity/ModuleEntity.java
@OneToMany(mappedBy = "module", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("orderIndex ASC")
@Builder.Default
private List<Lesson> lessons = new ArrayList<>();
```

`orphanRemoval = true` + `CascadeType.ALL` signifie que supprimer une
leçon de la liste Java suffit à la supprimer réellement en base à la
prochaine synchronisation — pas besoin d'appeler un repository de leçons
séparément depuis le service. Six entités du projet utilisent
`@OneToMany` (`Conversation`, `Formation`, `Lesson`, `ModuleEntity`,
`Question`, `Quiz`), toutes selon ce même schéma de collection possédée
par le parent.

Toutes les associations `@ManyToOne` observées sont explicitement en
`FetchType.LAZY` — jamais `EAGER` — cohérent avec `open-in-view: false`
(section 4.3) : charger une association reste un choix explicite du
code appelant, jamais un effet de bord implicite d'Hibernate.

## 14. Transactions — `@Transactional` et verrouillage de concurrence

37 des 46 services portent au moins une méthode `@Transactional`. Le cas
le plus intéressant du point de vue concurrence est
`QuizAttemptRepository#acquireStartLock`, qui pose un verrou consultatif
PostgreSQL **scopé à la transaction** :

```java
// backend/src/main/java/ma/iatacademy/api/repository/QuizAttemptRepository.java
/** Serializes concurrent start() calls for the same user+quiz so the "check for an
 * existing attempt, else create one" logic in QuizAttemptService can't race — without
 * this, N simultaneous requests each see "no open attempt" and each create their own row
 * (reproduced by loadtest/quiz-start-concurrency.js). Transaction-scoped: released
 * automatically when the calling @Transactional method commits or rolls back. */
@org.springframework.data.jpa.repository.Query(
        value = "SELECT pg_advisory_xact_lock(hashtext(:lockKey))", nativeQuery = true)
void acquireStartLock(@org.springframework.data.repository.query.Param("lockKey") String lockKey);
```

`pg_advisory_xact_lock` est une primitive PostgreSQL de verrou
applicatif, indépendante des verrous de lignes/tables classiques :
`hashtext(:lockKey)` transforme une clé arbitraire (probablement
`userId + quizId` concaténés côté `QuizAttemptService`) en entier 32 bits
utilisé comme identifiant de verrou. Le suffixe `_xact_` signifie que le
verrou est automatiquement relâché à la fin de la transaction appelante
(commit ou rollback), sans code de libération explicite à écrire. Le
commentaire documente précisément le problème résolu : sans ce verrou, N
requêtes concurrentes de `start()` pour le même couple
(utilisateur, quiz) passent chacune le test « pas de tentative en cours »
avant qu'aucune n'ait encore inséré la sienne, et créent chacune leur
propre ligne — un scénario explicitement reproduit par un script de test
de charge dédié (`loadtest/quiz-start-concurrency.js`).

## 15. Migrations Flyway

45 fichiers dans `backend/src/main/resources/db/migration/`, numérotés
`V1__init_schema.sql` à `V45__user_badges_share_code.sql`, convention
Flyway standard `V<N>__description_en_snake_case.sql`. Règle du projet
(rappelée dans `CLAUDE.md`) : **jamais modifier une migration déjà
fusionnée/déployée** — toute évolution de schéma passe par une nouvelle
migration. Extrait de la toute première (`V1__init_schema.sql`) :

```sql
-- IAT Academy — initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(30)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

La numérotation reflète l'évolution réelle du produit : `V17__groups.sql`
(cohortes), `V22__proctoring.sql` (télésurveillance des examens),
`V29__virtual_sessions.sql` (visioconférence), `V30__totp.sql` (2FA),
`V44__quiz_question_mode.sql` et `V45__user_badges_share_code.sql` (les
deux plus récentes) — chacune correspondant à une fonctionnalité livrée
successivement plutôt qu'à un schéma conçu intégralement à l'avance.

## 16. Authentification — JWT en cookie httpOnly

`JwtService` encapsule la génération/validation des jetons (bibliothèque
`jjwt`) :

```java
// backend/src/main/java/ma/iatacademy/api/security/JwtService.java
public String generateToken(UUID userId, String email, Role role) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + properties.getExpirationMs());
    return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("role", role.name())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(key)
            .compact();
}
```

Le jeton n'est jamais renvoyé dans le corps JSON de la réponse de
login : `AuthService` le pose directement comme cookie **httpOnly**
(inaccessible en JavaScript côté navigateur, donc non exfiltrable par une
faille XSS) :

```java
// backend/src/main/java/ma/iatacademy/api/service/AuthService.java
private void attachJwtCookie(HttpServletResponse response, String token) {
    ResponseCookie cookie = ResponseCookie.from(jwtService.getCookieName(), token)
            .httpOnly(true)
            .secure(jwtProperties.isCookieSecure())
            .sameSite("Lax")
            .path("/")
            .maxAge(Duration.ofMillis(jwtService.getExpirationMs()))
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
}
```

Un second type de jeton, plus court (5 minutes) et **jamais posé en
cookie**, sert le flux 2FA : `generatePendingTotpToken` porte uniquement
la claim `pending2fa: true` et transite dans le corps de la réponse tant
que l'utilisateur n'a pas saisi son code TOTP — `JwtAuthenticationFilter`
ne l'accepte donc jamais comme jeton de session valide, ce qui impose que
la route `/api/auth/verify-2fa` reste publique dans `SecurityConfig`
(commentée explicitement à cet effet, section 17).

## 17. Autorisation — `@PreAuthorize` et hiérarchie de rôles

`SecurityConfig` active la sécurité par méthode
(`@EnableMethodSecurity`) et définit une hiérarchie de rôles à un seul
niveau :

```java
// backend/src/main/java/ma/iatacademy/api/config/SecurityConfig.java
/**
 * SUPER_ADMIN inherits everything ADMIN (Directeur) can do — this hierarchy makes every
 * existing @PreAuthorize("hasRole('ADMIN')") pass for SUPER_ADMIN too, without touching
 * each annotation individually.
 */
@Bean
public RoleHierarchy roleHierarchy() {
    return RoleHierarchyImpl.fromHierarchy("ROLE_SUPER_ADMIN > ROLE_ADMIN");
}
```

Concrètement, un contrôleur qui écrit `@PreAuthorize("hasRole('ADMIN')")`
n'a jamais besoin d'écrire `hasAnyRole('ADMIN','SUPER_ADMIN')` : la
hiérarchie fait passer `SUPER_ADMIN` automatiquement. C'est pourquoi
`AdminController#updateRole` (section 3.4) n'autorise que `ADMIN` alors
que `SUPER_ADMIN` peut aussi l'appeler — mais l'inverse est faux :
`getAppSettings`, réservé explicitement à `hasRole('SUPER_ADMIN')`, reste
inaccessible à un simple `ADMIN`, la hiérarchie ne jouant que dans le
sens déclaré (`SUPER_ADMIN > ADMIN`).

Extrait de la chaîne de filtres, avec la liste blanche publique complète
et le motif documenté pour chaque exception :

```java
List<String> publicPaths = new java.util.ArrayList<>(List.of(
        "/api/auth/register", "/api/auth/login",
        // Called with only the short-lived pendingToken from login()'s
        // TotpRequiredException, never a full session cookie ...
        "/api/auth/verify-2fa",
        "/api/auth/forgot-password", "/api/auth/reset-password",
        "/api/auth/verify-email", "/api/auth/resend-verification",
        "/api/public/contact", "/api/public/newsletter",
        "/api/public/stage-signoff/**",
        "/api/certificates/verify/**", "/api/badges/verify/**",
        "/api/assets/*/file", "/api/assets/*/thumbnail",
        "/documents/**", "/actuator/health"
));
```

Toute route non listée exige une authentification
(`.anyRequest().authenticated()`), la session étant strictement
`STATELESS` — aucune session serveur, uniquement le JWT porté par le
cookie, validé à chaque requête par `JwtAuthenticationFilter`.

## 18. Gestion des rôles — `Role.java` et `isStaff()`

```java
// backend/src/main/java/ma/iatacademy/api/domain/enums/Role.java
public enum Role {
    SUPER_ADMIN, ADMIN, FORMATEUR, ETUDIANT, SUPPORT;

    /** ADMIN (Directeur), FORMATEUR and SUPER_ADMIN are all "staff" for access-control purposes. */
    public boolean isStaff() {
        return this == SUPER_ADMIN || this == ADMIN || this == FORMATEUR;
    }
}
```

`isStaff()` est la méthode la plus réutilisée du backend pour du contrôle
d'accès en dehors des annotations `@PreAuthorize` — utilisée notamment
dans `ProgressionService#assertModuleAccessible` (un membre du staff
n'est jamais bloqué par le déblocage séquentiel), et dans
`MessagingService#isMessagingEligible`, où `SUPPORT` est explicitement
ajouté en plus de `isStaff()` — preuve dans le code que `SUPPORT` est un
rôle interne mais **non staff** au sens strict de la plateforme.

## 19. Gestion des erreurs — flux global

Résumé du parcours (détaillé section 9) : toute exception (métier,
Spring Security, Spring MVC, ou non gérée) remonte vers
`GlobalExceptionHandler`, qui la traduit systématiquement en réponse JSON
`{"timestamp", "status", "error", ...}` avec le bon code HTTP — jamais un
message technique brut, jamais un 500 pour un cas identifiable (404,
403, 400, 409, 410, 429, 401). Le seul cas où aucun corps n'est écrit est
`ClientAbortException` (client déjà déconnecté).

## 20. Flux de données complet — `POST /api/stage/learners/{id}/uf-validations`

Trace réelle, méthode par méthode, de la validation d'une UF sensible par
un directeur/formateur.

**1. Requête HTTP entrante**
`POST /api/stage/learners/{learnerId}/uf-validations`, corps JSON
`{"ufCode": "UF 5", "validated": true, "note": "..."}`, cookie JWT
httpOnly.

**2. Sécurité (avant même d'atteindre le contrôleur)**
`JwtAuthenticationFilter` extrait le cookie, valide le jeton via
`JwtService#isValid`, peuple le `SecurityContext` avec un
`UserPrincipal`. La route n'étant pas dans `publicPaths`, elle exige une
authentification valide.

**3. Contrôleur — `StageController#validateUf`**
```java
@PostMapping("/learners/{learnerId}/uf-validations")
@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")
public ResponseEntity<UfValidationResponse> validateUf(
        @PathVariable UUID learnerId,
        @Valid @RequestBody ValidateUfRequest request,
        @AuthenticationPrincipal UserPrincipal principal
) {
    UfValidationResponse response = ufValidationService.validate(learnerId, request, principal);
    progressionService.checkAndAwardYearBadges(learnerId);
    return ResponseEntity.ok(response);
}
```
`@PreAuthorize` vérifie le rôle **avant** que le corps de la méthode
s'exécute (échec → `AccessDeniedException` → 403, section 9).
`@Valid` déclenche la validation Bean Validation sur `ValidateUfRequest`
(`@NotBlank ufCode`, `@NotNull validated`) — échec → 400 avec le détail
des champs.

**4. Service — `UfValidationService#validate`**
Contrôle métier supplémentaire (`principal.getRole().isStaff()` — en
théorie redondant avec `@PreAuthorize` mais qui protège contre un appel
interne futur qui contournerait le contrôleur), puis vérification que
`ufCode` fait partie de `DIRECTOR_GATED_UFS` (`"UF 5"`, `"UF 11"`) sinon
`ApiException` (400). Chargement de l'apprenant et du directeur via
`UserRepository#findById` (`NotFoundException` → 404 si absent).
Recherche ou création de la ligne `LearnerUfValidation` via
`LearnerUfValidationRepository#findByLearnerIdAndUfCode`, mise à jour de
ses champs, sauvegarde (`validationRepository.save(row)`). Si la
validation vient de passer de faux à vrai : notification à l'apprenant
(`NotificationService#notify`) et, si `ufCode` vaut `"UF 5"`, attribution
du badge `STAGE_VALIDATED` (`BadgeService#awardIfAbsent`).

**5. Repository / Base de données**
`LearnerUfValidationRepository.save(row)` déclenche Hibernate : `INSERT`
ou `UPDATE` sur `learner_uf_validations`, avec mise à jour automatique de
`updated_at` via `AuditableEntity#onUpdate` (callback `@PreUpdate`).
`UserRepository.findById` génère un `SELECT` sur `users`, les
associations `learner`/`validatedBy` restant en `LAZY` tant qu'elles ne
sont pas explicitement déréférencées.

**6. Retour dans le contrôleur — second appel de service**
`ProgressionService#checkAndAwardYearBadges(learnerId)` recharge
l'apprenant (`getReferenceById`, un proxy sans requête immédiate), puis
évalue `isYear1FullyDone`/`isYear2FullyDone` — qui, en cascade,
rappellent `ufValidationService.isValidated` (donc relisent la ligne
qui vient d'être écrite à l'étape 4) pour décider si l'année est
désormais complète et si un badge d'année doit être attribué.

**7. Réponse HTTP**
`UfValidationResponse` (record immuable, section 7) sérialisé en JSON par
Jackson, code 200. En cas d'exception à n'importe quelle étape 3-6,
`GlobalExceptionHandler` intercepte et renvoie le code HTTP approprié
(400/403/404) au lieu de laisser l'exception remonter brute.

## 21. Questions possibles du jury — Backend

**1. Pourquoi une architecture en couches (Controller/Service/Repository)
plutôt qu'un style plus direct ?**
Parce que ça isole trois responsabilités qui changent pour des raisons
différentes : le contrôleur ne change que si le contrat HTTP change, le
service ne change que si la règle métier change, le repository ne change
que si la façon d'interroger la base change. Concrètement, dans ce
projet, `ProgressionService` (369 lignes de règles de déblocage) peut
évoluer sans toucher à `StageController`, et inversement un nouveau
endpoint peut être ajouté à `StageController` sans dupliquer la logique
métier déjà écrite dans les services existants.

**2. Pourquoi une API REST plutôt que GraphQL ou RPC ?**
REST correspond naturellement au découpage en ressources du domaine
(utilisateurs, quiz, modules, badges...), s'appuie sur des méthodes HTTP
standard directement gérées par Spring Web (`@GetMapping`, etc.), et
s'intègre simplement avec Spring Security (autorisation par route/méthode
via `@PreAuthorize`). Aucun besoin de résolveur de schéma personnalisé
pour un frontend qui consomme des ressources assez stables.

**3. Pourquoi des DTO plutôt que d'exposer directement les entités JPA ?**
Trois raisons visibles dans le code : (a) éviter de sérialiser des
champs sensibles (`passwordHash`, `totpSecret` ne sont jamais dans
`UserResponse`) ; (b) éviter les problèmes de sérialisation d'une
association paresseuse non initialisée (`LazyInitializationException`,
directement documentée dans `BadgeService#getByShareCode`) ; (c)
découpler le contrat HTTP du schéma de base — une migration Flyway peut
renommer une colonne sans casser le contrat d'API si le DTO ne change
pas.

**4. Pourquoi une couche Service si le contrôleur pourrait appeler le
repository directement pour des cas simples ?**
Même un endpoint « simple » aujourd'hui accumule des règles avec le
temps (notification, badge, audit...) — les garder dans le service dès
le départ évite un refactor plus tard, et surtout centralise le contrôle
d'accès fin (`MessagingService#assertAccess`) qu'un `@PreAuthorize` seul
ne peut pas exprimer (« appartient à cette conversation précise »).

**5. Pourquoi Spring Data JPA / repository plutôt que du SQL à la main
partout ?**
Les méthodes dérivées (`findByEmailIgnoreCase`) éliminent le
boilerplate JDBC pour les cas courants, et `@Query` reste disponible pour
les cas où le nom de méthode dérivé serait imprononçable ou où un agrégat
SQL est nécessaire (`averageScoreByGroupGroupedByUser`). Le projet garde
même la porte ouverte au SQL natif quand JPQL ne suffit pas
(`pg_advisory_xact_lock`, question 14 ci-dessous).

**6. Comment fonctionne JPA/Hibernate ici, concrètement ?**
Chaque entité annotée `@Entity` est mappée à une table (`@Table`), les
champs à des colonnes (`@Column`), et les associations à des clés
étrangères (`@JoinColumn`). Hibernate génère le SQL correspondant à
chaque appel de repository. `spring.jpa.open-in-view: false` (vérifié
dans `application.yml`) signifie que la session Hibernate se ferme à la
fin de la transaction, pas à la fin de la requête HTTP — d'où la
nécessité d'initialiser explicitement certaines associations paresseuses
avant de sortir du service (`Hibernate.initialize`, ou `JOIN FETCH` dans
la requête elle-même comme dans `CertificateRepository`).

**7. Comment fonctionnent les relations entre entités dans ce projet ?**
Toutes les `@ManyToOne` observées sont en `FetchType.LAZY` (jamais
`EAGER`) — un choix de performance délibéré : charger l'entité parente
associée n'est jamais un effet de bord implicite. Les `@OneToMany`
(6 entités concernées) utilisent `mappedBy` pour indiquer le côté non
propriétaire de la relation, avec `cascade = CascadeType.ALL` et
`orphanRemoval = true` quand la collection est réellement possédée par le
parent (ex. les leçons d'un module).

**8. Comment sont gérées les transactions ?**
Via `@Transactional` de Spring, posé au niveau de la méthode de service
(37 services sur 46 en ont au moins une). `@Transactional(readOnly = true)`
pour les lectures (optimisation, empêche les écritures accidentelles),
`@Transactional` simple pour les écritures. Une méthode transactionnelle
qui lève une exception non contrôlée (`RuntimeException` et ses
sous-classes) déclenche un rollback automatique.

**9. Comment fonctionne la validation des entrées ?**
Bean Validation (Jakarta Validation) directement sur les composants des
DTO records (`@NotBlank`, `@NotNull`), déclenchée par `@Valid` sur le
paramètre `@RequestBody` du contrôleur. Une violation lève une
`MethodArgumentNotValidException`, interceptée par
`GlobalExceptionHandler#handleValidation`, qui renvoie un 400 avec le
détail champ par champ — jamais un message générique qui obligerait le
frontend à deviner quel champ est en cause.

**10. Comment sont gérées les exceptions de bout en bout ?**
Un unique `@RestControllerAdvice` (`GlobalExceptionHandler`) capture
toutes les exceptions du backend, avec un handler dédié par type
(métier, sécurité, validation, ressource introuvable, déconnexion
client) et un handler générique `Exception.class` en dernier recours qui
logue l'exception réelle côté serveur mais ne renvoie jamais son message
brut au client (risque de fuite d'information technique).

**11. Comment fonctionne JWT dans ce projet ?**
`JwtService` signe un jeton HMAC (bibliothèque `jjwt`) contenant l'id
utilisateur (`subject`), l'email et le rôle comme claims, avec une durée
d'expiration configurable. Le jeton n'est jamais retourné dans le JSON de
réponse : `AuthService#attachJwtCookie` le pose comme cookie
`httpOnly`, `secure` (configurable), `sameSite=Lax`. Un second type de
jeton, très court (5 minutes), sert uniquement le flux 2FA et ne passe
jamais par un cookie.

**12. Comment fonctionne Spring Security ici ?**
`SecurityConfig` configure une chaîne de filtres stateless (aucune
session serveur), avec `JwtAuthenticationFilter` ajouté avant le filtre
standard `UsernamePasswordAuthenticationFilter` pour authentifier chaque
requête à partir du cookie JWT. `@EnableMethodSecurity` active
l'évaluation des annotations `@PreAuthorize` directement sur les méthodes
de contrôleur.

**13. Comment sont gérés les rôles et les permissions ?**
Un enum `Role` à cinq valeurs, une hiérarchie déclarative
(`ROLE_SUPER_ADMIN > ROLE_ADMIN`) qui évite de dupliquer chaque
annotation `@PreAuthorize`, et une méthode utilitaire `isStaff()` pour
les vérifications qui ne passent pas par une annotation (contrôle
d'accès fin dans les services).

**14. Comment éviter les accès non autorisés à des données spécifiques à
un utilisateur ?**
Deux mécanismes complémentaires : `@PreAuthorize` pour le contrôle par
rôle (« qui a le droit d'appeler cet endpoint ») et une vérification
explicite dans le service pour le contrôle par propriété (« cet
utilisateur a-t-il le droit sur *cette* ressource précise »], comme
`MessagingService#assertAccess` ou la vérification d'identité dans
`StageController#ufValidations`. La règle du projet (CLAUDE.md) est
explicite : tout endpoint touchant les données d'un utilisateur doit
avoir l'un ou l'autre, jamais faire confiance à un id fourni par le
client sans vérification.

**15. Comment protéger un endpoint public sans compromettre la
sécurité ?**
En le listant explicitement dans `SecurityConfig.publicPaths` (jamais en
supprimant simplement `@PreAuthorize`), et en s'assurant que la donnée
exposée est réellement destinée à être publique (vérification d'un
badge/certificat par un tiers externe) plutôt que la donnée brute d'un
utilisateur. `PublicBadgeController` et `CertificateController#verify`
partagent ce principe.

**16. Comment gérer les erreurs HTTP de façon cohérente ?**
En centralisant tout dans `GlobalExceptionHandler` plutôt qu'en laissant
chaque contrôleur gérer ses propres `try/catch` — garantit un format de
réponse d'erreur homogène (`timestamp`, `status`, `error`) sur toute
l'API, vérifié dans le fichier unique cité section 9.

**17. Comment le projet évite-t-il les problèmes N+1 ?**
Pas de mécanisme systématique (`@EntityGraph` n'est utilisé nulle part
dans le code, vérifié par recherche) — le projet traite le problème au
cas par cas, uniquement là où il a été identifié : `CertificateRepository`
utilise `JOIN FETCH` explicite sur `formation` et `user` (avec un
commentaire expliquant que sans cela, l'accès après la fin de la
transaction lève une `LazyInitializationException`), et `BadgeService`
appelle `Hibernate.initialize()` ponctuellement. Ce n'est donc pas une
protection générique contre le N+1 à grande échelle, mais un traitement
réactif documenté à chaque endroit rencontré.

**18. Comment le projet gère-t-il la concurrence ?**
Le seul mécanisme de verrouillage explicite trouvé dans le code est
`QuizAttemptRepository#acquireStartLock`, un verrou consultatif
PostgreSQL scopé à la transaction (`pg_advisory_xact_lock`), qui
sérialise les appels concurrents à `start()` pour un même couple
utilisateur/quiz — évite la création de doublons de tentative en cas de
double-clic ou de requêtes simultanées. Il n'y a pas de verrouillage
optimiste (`@Version`) identifié ailleurs dans les entités du projet.

**19. Comment faire évoluer ce backend sans le casser ?**
Trois garde-fous déjà en place dans le projet : les migrations Flyway
numérotées ne sont jamais modifiées après fusion (une nouvelle migration
pour tout changement de schéma) ; les DTO découplent le contrat HTTP du
schéma de base, donc une migration peut renommer une colonne sans casser
l'API tant que le mapping manuel dans le service est mis à jour ; et la
suite de tests (JUnit5 + Mockito, un fichier de test par service dans
`backend/src/test/`) doit rester verte avant tout commit, selon la règle
du projet.

**20. Pourquoi une clé API "configurée" plutôt qu'un flag "activé" pour
Gemini/Grok ?**
Choix documenté dans `AiProviderProperties` : un fournisseur est
considéré configuré dès que sa clé API n'est pas vide, sans flag séparé
à synchroniser — évite l'état incohérent où une clé serait renseignée
mais le flag resterait à faux (ou l'inverse), un piège classique de
configuration à deux sources de vérité.
