# IAT Academy — le modèle de données

> Ce document analyse le modèle de données de IAT Academy : entités JPA,
> migrations Flyway, enums métier et patterns Hibernate. Tous les chiffres
> et extraits ci-dessous ont été vérifiés directement dans le code source
> du dépôt (`backend/src/main/java/ma/iatacademy/api/domain/`,
> `backend/src/main/resources/db/migration/`) — aucune entité, colonne ou
> migration n'est inventée. Voir `01-presentation-application.md` pour le
> contexte fonctionnel global.

## 1. Vue d'ensemble : combien d'entités, et pourquoi

Le paquetage `domain/entity` contient **40 fichiers `.java`**, mais un
seul d'entre eux, `AuditableEntity`, n'est **pas** une entité JPA
persistée : il est annoté `@MappedSuperclass` et non `@Entity`.

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
    protected void onCreate() { /* ... */ }

    @PreUpdate
    protected void onUpdate() { /* ... */ }
}
```

Ce choix (`@MappedSuperclass` plutôt que `@Entity` avec héritage
`JOINED`/`SINGLE_TABLE`) évite une table dédiée et une jointure
supplémentaire juste pour deux colonnes d'audit : chaque entité concrète
hérite des colonnes `created_at`/`updated_at` directement dans sa propre
table, remplies automatiquement par les callbacks JPA `@PrePersist`
/`@PreUpdate`.

La vérification exacte :

```bash
$ grep -l "^@Entity" backend/src/main/java/ma/iatacademy/api/domain/entity/*.java | wc -l
39
$ grep -n "@Entity\|@MappedSuperclass" backend/src/main/java/ma/iatacademy/api/domain/entity/AuditableEntity.java
14:@MappedSuperclass
```

**Il y a donc 39 entités JPA concrètes**, toutes héritant de
`AuditableEntity`, plus une classe de base non persistée. Ce chiffre
correspond exactement à celui annoncé dans l'Annexe B du rapport
(`rapport_latex/main.tex`, section « Annexe B : Répartition des 39
entités JPA par domaine fonctionnel ») — aucune divergence trouvée entre
le rapport et le code réel à ce sujet, y compris sur la répartition par
domaine reprise ci-dessous.

## 2. Répartition par domaine fonctionnel

| Domaine | Nombre | Entités |
|---|---|---|
| Comptes & sécurité | 2 | `User`, `AuditLogEntry` |
| Structure pédagogique | 4 | `Formation`, `ModuleEntity`, `Lesson`, `LessonBlock` |
| Contenu & médias | 4 | `Asset`, `AssetDownload`, `MediaFolder`, `LearnerDocument` |
| Évaluation & quiz | 9 | `Quiz`, `Question`, `AnswerOption`, `QuizAttempt`, `Submission`, `EssayGrade`, `GradeAdjustment`, `ProctoringEvent`, `Assignment` |
| Progression & certification | 4 | `LessonProgress`, `LearnerUfValidation`, `Certificate`, `TimeTrackingLog` |
| Groupes & organisation | 2 | `LearnerGroup`, `GroupContentAssignment` |
| Communication & engagement | 10 | `Message`, `Conversation`, `ConversationParticipant`, `Notification`, `LessonComment`, `LessonNote`, `ContactMessage`, `NewsletterSubscriber`, `EmailCampaign`, `EmailCampaignRecipient` |
| Stage & emploi | 2 | `StageSignoffInvite`, `JobOffer` |
| Gamification & sessions | 2 | `UserBadge`, `VirtualSession` |
| **Total** | **39** | |

Un fait structurel qui vaut la peine d'être noté : **aucune de ces 39
entités n'utilise `@ManyToMany`** (vérifié par grep sur tout le
paquetage). Chaque relation many-to-many métier passe par une entité de
jonction explicite portant ses propres colonnes — `ConversationParticipant`
(participation + `lastReadAt`), `UserBadge` (obtention + date + code de
partage), `GroupContentAssignment` (contenu assigné à un groupe),
`EmailCampaignRecipient` (statut d'envoi par destinataire). C'est un choix
de modélisation constant dans tout le projet, pas une exception isolée.

## 3. Entités centrales

### 3.1 `User` — compte et profil

`backend/src/main/java/ma/iatacademy/api/domain/entity/User.java`,
table `users`. Champ pivot de toute la plateforme : 26 colonnes propres
(hors audit), dont `role` (`Role`, obligatoire), `paymentStatus`
(`PaymentStatus`, défaut `PENDING`), et deux mécanismes d'onboarding
distincts qui cohabitent dans la même table :

- inscription standard : `email` + `passwordHash`, `emailVerified`,
  `verificationToken` ;
- import en masse (cohortes présentielles, Excel) : `matricule` comme
  identifiant de connexion initial, `profileCompleted = false` tant que
  l'apprenant n'a pas basculé vers un compte email + mot de passe
  personnel.

Relation : `@ManyToOne(fetch = LAZY) group` vers `LearnerGroup`
(nullable — `null` signifie apprenant 100 % en ligne, progression
automatique ; non-`null` signifie progression pilotée par un directeur).
Le commentaire du code est explicite sur ce point :

```java
/**
 * Groupe présentiel/hybride. Null = apprenant 100% en ligne (progression
 * automatique classique). Non-null = progression pilotée par le directeur.
 */
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "group_id")
private LearnerGroup group;
```

### 3.2 `Formation` et `ModuleEntity` — pourquoi l'UF n'est pas une table

`Formation` (table `formations`) est la racine du catalogue : un titre,
un statut `published`, et `@OneToMany(mappedBy = "formation", cascade =
ALL, orphanRemoval = true) modules`, triée par `@OrderBy("orderIndex
ASC")`.

`ModuleEntity` (table `modules`, nom de classe différent du nom de table
car `Module` est un type réservé par `java.lang.Module`) porte deux
colonnes qui sont le point le plus discuté du modèle :

```java
// backend/src/main/java/ma/iatacademy/api/domain/entity/ModuleEntity.java
@Column(name = "year_number")
private Integer yearNumber;

@Column(name = "uf_code", length = 20)
private String ufCode;

@Column(name = "uf_title", length = 255)
private String ufTitle;
```

L'Unité de Formation (UF) n'est **volontairement pas** une table dédiée
avec sa propre clé étrangère. C'est un attribut scalaire (`uf_code` +
`uf_title`) porté directement par `ModuleEntity`, et retrouvé par
regroupement (plusieurs modules partagent le même `uf_code`). La
migration `V33` documente explicitement ce choix, au moment où `Quiz` a
eu besoin à son tour de référencer une UF ou une année :

```sql
-- backend/src/main/resources/db/migration/V33__quiz_uf_year_scope.sql
-- FIN_UF / FIN_ANNEE quiz scopes: neither a UF nor a "year" is a standalone entity
-- (a UF is just modules.uf_code, a year is just modules.year_number), so a quiz scoped
-- to one needs plain scalar columns instead of another FK like lesson_id/module_id.
-- formation_id is needed because neither has any other way to identify which formation
-- it belongs to.
ALTER TABLE quizzes ADD COLUMN formation_id UUID REFERENCES formations(id);
ALTER TABLE quizzes ADD COLUMN uf_code VARCHAR(20);
ALTER TABLE quizzes ADD COLUMN year_number INTEGER;
```

Autrement dit : une UF et une année académique n'ont, dans ce domaine
métier, aucune autre raison d'exister comme ligne indépendante — elles ne
sont qu'un regroupement logique de modules. Créer une table `uf` juste
pour lui donner une clé primaire aurait ajouté une jointure partout sans
apporter de donnée propre. `LearnerUfValidation` (section 3.4) applique
exactement le même principe côté validation.

### 3.3 `Lesson` et `LessonBlock`

`Lesson` (table `lessons`) appartient à un `ModuleEntity`
(`@ManyToOne(fetch = LAZY, optional = false)`) et porte, comme
`Formation`→`ModuleEntity`, un `@OneToMany(cascade = ALL, orphanRemoval =
true) blocks` vers `LessonBlock`, ordonné par `orderIndex`. Ce triplet
`Formation → ModuleEntity → Lesson → LessonBlock`, chacun en cascade sur
le niveau inférieur avec suppression orpheline, reproduit fidèlement la
hiérarchie pédagogique décrite en section 1 : supprimer un module efface
en cascade ses leçons puis leurs blocs, sans jointure de nettoyage
manuelle.

### 3.4 `Quiz` — cinq portées possibles pour un seul type d'entité

`Quiz` (table `quizzes`) peut être rattaché à quatre granularités
différentes selon `QuizType`, avec des colonnes optionnelles pour chacune
— trois `@ManyToOne(fetch = LAZY)` (`lesson`, `module`, `formation`,
toutes nullable) plus les deux colonnes scalaires `ufCode`/`yearNumber`
de la section 3.2 :

```java
/** Optional link to a lesson (section quiz). */
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "lesson_id")
private Lesson lesson;

/** Optional link to a module (end-of-module quiz). */
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "module_id")
private ModuleEntity module;

/** Only set for FIN_UF/FIN_ANNEE — neither a UF nor a year has any other FK to hang
 *  off of, so these three scalar fields identify the scope directly instead. */
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "formation_id")
private Formation formation;
```

`questionMode` (`QuizQuestionMode`) est fixé à la création et verrouille
le type de question accepté pour tout le quiz (le commentaire du code le
précise : « Fixé à la création, verrouille le type de question accepté
pour tout le quiz »). `Quiz` porte aussi la configuration anti-triche
(`proctoringEnabled`, `focusLossDetection`, `copyProtection`,
`lockdownMode`), désactivée par défaut, activable par quiz au choix du
directeur pédagogique. `@OneToMany(mappedBy = "quiz", cascade = ALL,
orphanRemoval = true) questions` complète l'entité.

### 3.5 `Question` — type variable + métadonnées JSON

`Question` (table `questions`) référence son `Quiz` parent
(`@ManyToOne(fetch = LAZY)`, nullable — une question peut temporairement
exister hors quiz pendant l'édition) et porte un champ `metadata` typé
JSONB via Hibernate :

```java
/**
 * Configuration spécifique au type : ESSAY → {@code {maxLength}} (optionnel).
 * Null pour les types à choix (SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE).
 */
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")
private Map<String, Object> metadata;
```

Ce champ évite de créer une colonne par type de question (ou une table
de sous-types) pour un unique paramètre optionnel propre au type ESSAY.
`@OneToMany(mappedBy = "question", cascade = ALL, orphanRemoval = true)
options` porte les `AnswerOption` triées par `orderIndex`.

### 3.6 `LearnerUfValidation` — la validation, pas l'UF elle-même

`backend/src/main/java/ma/iatacademy/api/domain/entity/LearnerUfValidation.java`,
table `learner_uf_validations`. Même principe qu'en 3.2 : pas de clé
étrangère vers une UF (elle n'a pas de table), juste le même `ufCode`
scalaire, associé à l'apprenant concerné :

```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "learner_id", nullable = false)
private User learner;

@Column(name = "uf_code", nullable = false, length = 20)
private String ufCode;

@Column(nullable = false)
@Builder.Default
private boolean validated = false;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "validated_by")
private User validatedBy;
```

Deux `@ManyToOne` vers `User` coexistent (`learner` et `validatedBy`) :
l'apprenant concerné et le directeur qui a validé — traçabilité explicite
d'une décision qui, contrairement à la progression de leçon, n'est pas
automatique (voir section 1 de `01-presentation-application.md`).

### 3.7 `Certificate` — clé publique de vérification

Table `certificates`. Deux `@ManyToOne(fetch = LAZY, optional = false)`
obligatoires (`user`, `formation`), et une contrainte d'unicité au niveau
SQL (`UNIQUE (user_id, formation_id)`, posée dès `V1`) qui garantit
qu'un même apprenant ne peut avoir qu'un seul certificat par formation —
la contrainte d'intégrité porte la règle métier, pas seulement le code
Java. `verificationCode` (unique, 64 caractères) est la clé publique
utilisée par la page de vérification externe.

### 3.8 `UserBadge` — gamification avec code de partage

Table `user_badges`. `badgeCode` (`BadgeCode`, enum à 7 valeurs, voir
section 5) plus `shareCode`, ajouté après coup par la migration `V45`
(voir section 4) sur le modèle exact de `Certificate.verificationCode` —
le commentaire du code le dit explicitement :

```java
/** Code public court, sur le modèle de Certificate.verificationCode — sert la page
 *  publique de partage (/achievements/{code}) et l'image LinkedIn associée. */
@Column(name = "share_code", nullable = false, unique = true, length = 20)
private String shareCode;
```

## 4. Migrations Flyway

**45 migrations**, numérotées `V1` à `V45` sans trou ni doublon (vérifié
par comparaison de la séquence attendue avec les fichiers réels),
localisées dans `backend/src/main/resources/db/migration/`. Convention de
nommage : `V<N>__description_en_snake_case.sql`, `N` strictement croissant
et jamais réutilisé. Flyway les applique une fois, dans l'ordre
numérique, et enregistre chaque application dans sa table interne
`flyway_schema_history` — c'est ce registre qui interdit de modifier une
migration déjà appliquée : Flyway compare le checksum du fichier à celui
enregistré au moment de l'application, et refuse de démarrer si le
fichier a changé depuis (une migration passée n'est donc jamais éditée ;
un correctif prend toujours le numéro suivant).

**Création de table simple** — `V1__init_schema.sql` pose le schéma
initial complet (`users`, `formations`, `modules`, `lessons`, etc.) :

```sql
CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    order_index     INTEGER      NOT NULL,
    published       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (module_id, order_index)
);
```

**Ajout de colonne rétrocompatible** — `V18__matricule_profile_completed.sql`,
pour l'import en masse évoqué en section 3.1, illustre la précaution
standard du projet sur les migrations additives (défaut choisi pour ne
pas casser les comptes existants) :

```sql
-- DEFAULT TRUE : les comptes existants ne sont pas impactés (même approche que
-- email_verified dans V11) — seuls les comptes importés démarrent à false.
ALTER TABLE users ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT TRUE;
```

**Migration avec backfill + contrainte** — `V45__user_badges_share_code.sql`
ajoute une colonne `NOT NULL UNIQUE` sur une table déjà peuplée en trois
étapes obligatoires (ajout nullable → backfill → verrouillage) :

```sql
ALTER TABLE user_badges ADD COLUMN share_code VARCHAR(20);

UPDATE user_badges
SET share_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 16))
WHERE share_code IS NULL;

ALTER TABLE user_badges ALTER COLUMN share_code SET NOT NULL;
ALTER TABLE user_badges ADD CONSTRAINT uq_user_badges_share_code UNIQUE (share_code);
```

Autre exemple révélateur de l'évolution du schéma : `V24__question_bank.sql`
avait introduit une fonctionnalité de « banque de questions » avec tirage
aléatoire, retirée douze migrations plus tard par
`V36__drop_question_banks.sql` :

```sql
-- Retire la fonctionnalité "banque de questions" (tirage aléatoire) — jugée redondante
-- avec le réordonnancement/mélange des questions déjà existant sur un quiz.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS chk_question_owner;
DROP INDEX IF EXISTS idx_questions_bank;
ALTER TABLE questions DROP COLUMN IF EXISTS question_bank_id;
ALTER TABLE questions DROP COLUMN IF EXISTS source_bank_item_id;
DROP TABLE IF EXISTS question_banks;
```

C'est la preuve concrète que le principe « jamais modifier une migration
déjà déployée » est respecté même quand une fonctionnalité entière est
abandonnée : plutôt que de réécrire `V24`, le projet ajoute une migration
qui défait proprement ce que `V24` avait fait, en conservant l'historique
réel de l'évolution du schéma.

## 5. Enums métier

22 enums recensés dans `backend/src/main/java/ma/iatacademy/api/domain/enums/` :

| Enum | Rôle |
|---|---|
| `Role` | `SUPER_ADMIN`, `ADMIN`, `FORMATEUR`, `ETUDIANT`, `SUPPORT` — voir `isStaff()` |
| `Civility` | Civilité du profil `User` |
| `PaymentStatus` | `PENDING`, `PAID`, `EXEMPTED` |
| `EnrollmentMode` | Mode d'inscription de l'apprenant |
| `BlockType` | Type de bloc de contenu (`LessonBlock`) |
| `QuizType` | Portée du quiz (section, module, fin d'UF, fin d'année, …) |
| `QuizQuestionMode` | Type de question verrouillé pour tout le quiz |
| `QuestionType` | `SINGLE_CHOICE`, `MULTI_CHOICE`, `TRUE_FALSE`, `ESSAY`, … |
| `AttemptStatus` | Statut d'une tentative de quiz (`QuizAttempt`) |
| `SubmissionStatus` | Statut d'un devoir déposé (`Submission`) |
| `ModuleLearnerStatus` | Statut de progression d'un apprenant sur un module |
| `ProctoringEventType` | Type d'événement anti-triche détecté |
| `LearnerDocType` / `LearnerDocStatus` | Type et statut d'un document de stage |
| `ContractType` | Type de contrat (`JobOffer`) |
| `ConversationType` | `DIRECT`, `COHORT_ROOM` |
| `NotificationType` | 11 valeurs (`QUIZ_GRADED`, `UF_VALIDATED`, `BADGE_EARNED`, …) |
| `BadgeCode` | 7 badges, avec libellé/description/icône embarqués dans l'enum |
| `CampaignStatus` / `CampaignAudience` / `CampaignRecipientStatus` | Cycle de vie d'une campagne email |
| `SessionProvider` | Fournisseur de visioconférence (`VirtualSession`) |

Exemple d'enum porteur de données (pas seulement un nom de constante) —
`BadgeCode` embarque directement son contenu d'affichage :

```java
public enum BadgeCode {
    FIRST_MODULE("Premier module", "Premier module terminé.", "🎓"),
    PERFECT_QUIZ("Sans faute", "100% obtenu à un quiz.", "🏆"),
    STAGE_VALIDATED("Stage validé", "Unité de stage validée par l'académie.", "🧳"),
    // ...
    private final String label;
    private final String description;
    private final String icon;
}
```

Toutes les colonnes enum sont persistées avec `@Enumerated(EnumType.STRING)`
(jamais `ORDINAL`) — vérifié sur l'ensemble des entités : la valeur
stockée en base est le nom de la constante, pas son index, ce qui rend
l'ajout ou la réorganisation de valeurs sans risque de décalage silencieux
des données existantes.

## 6. Patterns JPA/Hibernate

`backend/src/main/resources/application.yml` confirme deux réglages
structurants :

```yaml
jpa:
  hibernate:
    ddl-auto: validate
  open-in-view: false
```

- **`ddl-auto: validate`** : Hibernate ne génère jamais le schéma ; il se
  contente de vérifier au démarrage que les entités correspondent aux
  tables déjà créées par Flyway. Le schéma réel n'a qu'une seule source
  de vérité : les migrations.
- **`open-in-view: false`** : la session Hibernate se ferme à la fin de
  la transaction `@Transactional` du service, avant que le contrôleur ne
  sérialise la réponse. Conséquence directe : tout accès à une
  association `LAZY` (le fetch par défaut, utilisé sur la quasi-totalité
  des `@ManyToOne`/`@OneToMany` du projet) doit être déclenché **à
  l'intérieur** de la transaction, faute de quoi Hibernate lève une
  `LazyInitializationException` une fois la session fermée.

Le projet a rencontré ce problème en conditions réelles, documenté dans
`CertificateRepository` :

```java
// backend/src/main/java/ma/iatacademy/api/repository/CertificateRepository.java
/** JOIN FETCH is required here: CertificateController#toResponse reads
 * cert.getFormation().getTitle() / cert.getUser().getFullName() after the
 * @Transactional service call has already returned (session closed), so a plain
 * lazy association throws LazyInitializationException the first time a real
 * certificate exists — never hit before since no demo data had one until now. */
@Query("SELECT c FROM Certificate c JOIN FETCH c.formation JOIN FETCH c.user WHERE c.user.id = :userId AND c.formation.id = :formationId")
Optional<Certificate> findByUserIdAndFormationId(@Param("userId") UUID userId, @Param("formationId") UUID formationId);
```

La solution retenue partout dans le projet est donc `JOIN FETCH` explicite
dans la requête JPQL du repository dès que le contrôleur a besoin d'une
association après le retour du service — plutôt que d'activer
`open-in-view: true` (qui aurait masqué le problème en gardant la
connexion ouverte jusqu'à la sérialisation, au prix d'une connexion base
de données tenue plus longtemps que nécessaire par requête HTTP).
203 méthodes de service sont annotées `@Transactional` dans le projet,
ce qui délimite précisément la fenêtre pendant laquelle les proxies
lazy restent utilisables.

## 7. Questions possibles du jury — Base de données

**Q1 — Pourquoi un modèle relationnel plutôt que NoSQL ?**
Le domaine est hiérarchique (Formation → Module → Leçon → Bloc,
apprenant → tentative → réponse) avec des contraintes transversales
(un seul certificat par apprenant/formation, une seule progression par
apprenant/leçon) naturellement portées par des clés étrangères et des
`UNIQUE` en base. Les reproduire applicativement dans un magasin NoSQL
déplacerait le risque d'incohérence vers le code métier, sans que le
volume de données justifie un besoin d'échelle horizontale.

**Q2 — Pourquoi Flyway plutôt que Liquibase ou un `ddl-auto` Hibernate ?**
Flyway est explicite (SQL versionné, lisible en revue de code), s'intègre
nativement à Spring Boot, et son modèle append-only donne un historique
fiable — utile ici puisque le projet a effectivement fait marche arrière
sur une fonctionnalité (`V24` → `V36`) sans jamais réécrire l'historique.

**Q3 — Comment gérer l'évolution du schéma en production ?**
Chaque changement passe par une nouvelle migration numérotée, jamais par
l'édition d'un fichier existant. `ddl-auto: validate` empêche tout écart
silencieux entre entités Java et schéma réel : une colonne manquante fait
échouer le démarrage plutôt que de laisser Hibernate improviser un DDL.

**Q4 — Pourquoi PostgreSQL ?**
Des fonctionnalités PostgreSQL sont utilisées au-delà du relationnel pur :
`JSONB` indexé en `GIN` (`lesson_blocks.content`, `Question.metadata`),
UUID générés côté base (`gen_random_uuid()` via `pgcrypto`), et index
uniques partiels (`CREATE UNIQUE INDEX ... WHERE matricule IS NOT NULL`,
`V18`) — des besoins concrets, pas un choix par défaut non justifié.

**Q5 — Comment sont gérées les relations bidirectionnelles ?**
Via `mappedBy` côté inverse (`Formation.modules`, `mappedBy =
"formation"`) ; le côté possédant la clé étrangère
(`ModuleEntity.formation`) reste l'unique source de vérité. Aucune
synchronisation manuelle des deux côtés n'a été observée hors de ce
mécanisme JPA standard.

**Q6 — Quelles contraintes d'intégrité sont utilisées ?**
`ON DELETE CASCADE` pour un contenu qui n'a pas de sens sans son parent,
`ON DELETE SET NULL` pour un simple auteur/référent (`learner_groups.created_by`),
`UNIQUE` composites (`(module_id, order_index)`, `(user_id, formation_id)`
sur `certificates`), et des contraintes nommées ajoutées après coup
(`uq_user_badges_share_code`, `V45`).

**Q7 — Comment éviter les N+1 sur les relations ?**
`fetch = LAZY` par défaut sur quasiment tous les `@ManyToOne`/`@OneToMany`
évite de charger tout le graphe d'un coup. Quand une association est
réellement nécessaire après retour du service (`open-in-view: false`,
section 6), le repository utilise un `JOIN FETCH` JPQL explicite (voir
`CertificateRepository`) plutôt que de compter sur le proxy lazy.

**Q8 — Pourquoi ces choix de dénormalisation ?**
Le cas le plus net : `uf_code` est répété tel quel sur `ModuleEntity`,
`Quiz` et `LearnerUfValidation` plutôt que de passer par une table de
référence, parce qu'une UF n'a aucun attribut propre au-delà d'un code
et d'un titre — une jointure systématique pour une entité sans colonne
supplémentaire à porter n'aurait rien apporté.

**Q9 — Comment le modèle pourrait-il évoluer ?**
Le point le plus probable : faire de l'UF une véritable entité si elle
devait porter des attributs propres (prérequis inter-UF, description).
La convention Flyway (jamais de retour en arrière sur une migration)
rend ce chemin direct : nouvelle table, backfill depuis les `uf_code`
existants, puis remplacement progressif des colonnes scalaires par des
clés étrangères — le même schéma qu'a suivi `V45`.

**Q10 — Pourquoi `AuditableEntity` en `@MappedSuperclass` plutôt qu'une
entité avec héritage JPA (`JOINED`) ?**
Aucune des 39 entités n'a besoin d'être interrogée polymorphiquement en
tant qu'« entité auditable » générique — chacune vit dans sa propre
table. `@MappedSuperclass` suffit (deux colonnes, deux callbacks
partagés) sans le coût d'une jointure ou d'un discriminant inutilisés.

**Q11 — Pourquoi aucun `@ManyToMany` dans le modèle ?**
Chaque relation many-to-many réelle porte une donnée propre à
l'association (date de lecture, date d'obtention, statut d'envoi) que
`@ManyToMany` seul n'exprime pas. Le projet va directement à l'entité de
jonction (`ConversationParticipant`, `UserBadge`,
`GroupContentAssignment`, `EmailCampaignRecipient`) plutôt que de partir
d'une table de jointure pure à migrer plus tard.

**Q12 — Comment le projet garantit-il qu'une migration n'est jamais
modifiée après déploiement ?**
Flyway calcule un checksum de chaque fichier à l'application et le
compare à celui stocké dans `flyway_schema_history` à chaque démarrage
suivant ; un écart fait échouer le démarrage. La règle d'équipe est donc
doublement protégée : par discipline de revue, et par un contrôle
technique qui bloque l'application si elle est violée malgré tout.

## 8. Références

- Entités : `backend/src/main/java/ma/iatacademy/api/domain/entity/`
- Enums : `backend/src/main/java/ma/iatacademy/api/domain/enums/`
- Migrations : `backend/src/main/resources/db/migration/`
- Configuration JPA/Flyway : `backend/src/main/resources/application.yml`
- Répartition par domaine (source croisée) : `rapport_latex/main.tex`,
  section « Annexe B »
