# IAT Academy — présentation générale de l'application

> Ce document présente l'application IAT Academy dans ses grandes lignes,
> à destination d'un lecteur qui découvre le projet. Pour le détail de
> l'architecture technique, des schémas et des flux de données, voir
> `02-architecture-et-diagrammes.md`. Toutes les affirmations de ce
> document sont vérifiables dans le code source du dépôt (`backend/` et
> `frontend/`).

## 1. Le problème métier

IAT Academy est une académie de formation professionnelle marocaine
préparant aux métiers de l'aviation, de l'accueil et du tourisme (Hôtesse
de l'air / Steward, Agent d'escale, Accompagnateur touristique, Réception
hôtelière), sur un cursus de deux ans mêlant cours en présentiel et stage
en entreprise intégré au parcours.

Avant cette plateforme, aucun espace numérique ne réunissait le contenu
pédagogique, les évaluations et le suivi de progression des apprenants.
Cette situation posait trois difficultés concrètes :

- **Pas de vue d'ensemble de la progression** : savoir où en était un
  apprenant donné (modules complétés, évaluations restantes, stage validé
  ou non) exigeait de recouper plusieurs sources manuellement.
- **Évaluation non centralisée** : quiz, devoirs et réponses libres
  n'étaient ni regroupés, ni tracés de façon homogène, rendant la
  correction dépendante de pratiques individuelles.
- **Absence de contrôle d'accès séquentiel** : rien n'empêchait
  techniquement un apprenant d'accéder à du contenu avancé sans avoir
  validé les prérequis — un point d'autant plus sensible que certaines
  étapes du cursus (validation de stage, soutenance finale) ne peuvent pas
  se réduire à un critère automatique et exigent le jugement explicite
  d'un directeur pédagogique.

À cela s'ajoutait un processus de délivrance de certificats entièrement
manuel, sans preuve numérique vérifiable par un tiers (employeur,
partenaire du secteur).

## 2. Objectifs du projet

Le projet répond à six objectifs concrets :

1. Représenter fidèlement la structure pédagogique réelle du cursus
   (Formation → Module → Leçon → Bloc de contenu).
2. Fournir un système d'évaluation complet — plusieurs types de quiz
   selon leur portée, plusieurs types de questions, avec correction
   automatique et correction manuelle convergeant vers un score final
   unique.
3. Garantir un déblocage séquentiel du contenu, vérifié côté serveur et
   non simplement suggéré côté interface.
4. Fournir à l'équipe pédagogique un espace d'administration complet
   (contenu, correction, suivi des apprenants, validations manuelles).
5. Automatiser la délivrance de certificats numériquement vérifiables et
   outiller le suivi du stage jusqu'à sa signature par un tuteur externe.
6. Sécuriser transversalement la plateforme (authentification,
   séparation des rôles, protection contre les abus) avec un déploiement
   reproductible.

## 3. Utilisateurs et rôles

Le système distingue cinq rôles applicatifs, définis dans
`Role.java` (`backend/src/main/java/ma/iatacademy/api/domain/enums/Role.java`) :

| Rôle | Statut | Responsabilités |
|---|---|---|
| `SUPER_ADMIN` | staff | Tous les droits Admin, plus les réglages système globaux. |
| `ADMIN` (Directeur pédagogique) | staff | Gestion pédagogique complète, validations manuelles sensibles, gestion des groupes/campagnes email, plus tous les droits Formateur. |
| `FORMATEUR` | staff | Création de cours et de quiz, correction manuelle, messagerie, bourse à l'emploi. |
| `ETUDIANT` | apprenant | Espace personnel : contenu, quiz, stage, certificat, messagerie. |
| `SUPPORT` | **non staff** | Consultation en lecture seule des statistiques et de la progression, gestion des messages de contact et de la newsletter, joignable en messagerie directe par les apprenants — mais sans droit pédagogique ni administratif. |

Ce dernier point est une nuance volontaire du code : la méthode
`Role.isStaff()` ne renvoie vrai que pour `SUPER_ADMIN`, `ADMIN` et
`FORMATEUR` — `SUPPORT` en est explicitement exclu, malgré son statut de
compte interne. Cette distinction conditionne le contrôle d'accès à
plusieurs endroits du backend (par exemple `MessagingService#assertAccess`
pour les salons de cohorte).

À ces rôles internes s'ajoutent des **acteurs externes sans compte** :

- **Le tuteur de stage** (entreprise d'accueil) : reçoit un lien à usage
  unique et signe électroniquement l'attestation de stage sans jamais
  créer de compte — voir `StageSignoffInvite` (entité à token expirant, à
  usage unique) et `PublicStageSignoffController`
  (`/api/public/stage-signoff/{token}`), volontairement sans annotation
  `@PreAuthorize` : l'accès est protégé par la seule possession du jeton.
- **Le visiteur public** : peut soumettre le formulaire de contact ou
  s'abonner à la newsletter (`PublicLeadController`,
  `/api/public/contact` et `/api/public/newsletter`), vérifier
  publiquement un certificat (`CertificateController#verify`,
  `/api/certificates/verify/{code}`) ou un badge partagé sur les réseaux
  professionnels (`PublicBadgeController`, `/api/badges/verify/{code}`),
  sans authentification.

## 4. Fonctionnalités principales

L'analyse des 31 contrôleurs REST du backend
(`backend/src/main/java/ma/iatacademy/api/controller/`) fait apparaître
les domaines fonctionnels suivants :

- **Authentification et sécurité** (`AuthController`) : inscription,
  connexion par JWT en cookie `httpOnly`, vérification d'email.
- **Catalogue de cours** (`FormationController`, `ModuleController`,
  `LessonController`) : structure Formation → Module → Leçon, chaque
  leçon étant composée de blocs de contenu typés (`LessonBlock` /
  `BlockType` : `VIDEO`, `TEXT`, `PDF`, `IMAGE`).
- **Quiz et évaluation** (`QuizController`, `GradebookController`,
  `LearnerGradebookController`) : quiz à plusieurs portées (`QuizType` :
  `APPLICATIF`, `FIN_MODULE`, `FIN_UF`, `FIN_ANNEE`), plusieurs types de
  questions, correction automatique et correction manuelle des réponses
  libres (`EssayGrade`) convergeant vers un carnet de notes commun.
- **Devoirs** (`AssignmentController`) : dépôt et correction de devoirs
  distincts des quiz.
- **Progression** (`ProgressController`) : suivi de l'avancement de
  l'apprenant dans le cursus, condition du déblocage séquentiel du
  contenu.
- **Gestion du stage** (`StageController` + `PublicStageSignoffController`) :
  dépôt du dossier de stage par l'apprenant, suivi par l'équipe
  pédagogique, signature électronique par le tuteur externe.
- **Certification** (`CertificateController`) : émission et vérification
  publique de certificats.
- **Badges** (`BadgeController`, `PublicBadgeController`) : récompenses de
  parcours partageables publiquement.
- **Messagerie** (`MessagingController`) : conversations directes et
  salons de cohorte.
- **Bourse à l'emploi** (`JobOfferController`) : offres publiées par le
  staff, consultées par les apprenants.
- **Recherche** (`SearchController`) : recherche transverse dans le
  contenu.
- **Administration** (`AdminController`, `GroupController`,
  `EmailCampaignController`, `MediaFolderController`, `AssetController`) :
  gestion des utilisateurs, des groupes/cohortes, des campagnes email, de
  la bibliothèque de médias.
- **Assistant de cours par IA** (`CourseAssistantController`) : questions
  posées par l'apprenant sur le contenu d'une leçon.

## 5. Fonctionnalités secondaires

- **Agenda personnel** (`AgendaController`, `/api/me/agenda`).
- **Notes de leçon privées** (`LessonNoteController`) : chaque apprenant
  peut annoter ses propres leçons.
- **Commentaires** (`CommentController`) : fils de discussion sur le
  contenu, modérés par le staff.
- **Notifications** (`NotificationController`).
- **Analytique pédagogique** (`AnalyticsController`) : indicateurs
  agrégés à l'usage du staff.
- **Sessions virtuelles / classes en ligne** (`VirtualSessionController`).
- **Préférence de thème** (`ThemeController`, `/api/me/theme`) : mode
  clair/sombre par utilisateur.
- **Suivi du temps passé** (entité `TimeTrackingLog`) et détection précoce
  de décrochage (`EarlyWarningService`).

## 6. Principaux workflows

**Parcours pédagogique standard** : un apprenant s'inscrit, suit les
modules d'une unité de formation, passe les quiz associés (portée
section/module/UF/année selon le cas) et des devoirs ; la progression
n'autorise l'accès au contenu suivant qu'une fois les prérequis validés
côté serveur. En fin de parcours, certaines unités de formation exigent
une validation manuelle du directeur pédagogique plutôt qu'un simple
critère automatique.

**Workflow de stage avec signature externe** : l'apprenant dépose son
dossier de stage ; le staff crée une invitation de signature liée à la
validation d'UF correspondante (`StageSignoffInvite`, avec jeton unique et
date d'expiration) ; le lien est transmis au tuteur en entreprise, qui
consulte l'attestation et la signe électroniquement via
`PublicStageSignoffController`, sans jamais posséder de compte sur la
plateforme. Une fois signé, le jeton est marqué utilisé (`usedAt`) et ne
peut plus resservir.

**Délivrance et vérification du certificat** : une fois le cursus validé,
un certificat numérique est émis avec un code de vérification unique. Le
PDF lui-même reste réservé à l'établissement (remise physique à
l'apprenant, téléchargement impossible pour l'`ETUDIANT` — seul `ADMIN`
peut le télécharger, voir `CertificateController#downloadForSchool`) ;
en revanche, n'importe qui peut vérifier publiquement l'authenticité d'un
certificat à partir de son code, sans authentification.

## 7. Architecture globale

L'application suit une architecture classique en trois niveaux : un
frontend Next.js 15 (App Router, TypeScript strict, Tailwind v4) qui sert
deux espaces distincts — `app/**` pour les apprenants et
`(admin)/admin/**` pour le staff — communique en HTTP/JSON avec un
backend Spring Boot 3.4.5 (Java 21+) organisé en couches
Contrôleur → Service → Repository → Entité, lequel persiste ses données
dans PostgreSQL (schéma versionné par migrations Flyway) et s'appuie sur
Redis pour la limitation de débit. Le détail de cette architecture
(diagrammes de composants, de séquence, modèle de données complet) est
développé dans `02-architecture-et-diagrammes.md`.

## 8. Fonctionnement général — parcours d'un utilisateur

Prenons l'exemple d'un apprenant type : il se connecte (JWT posé en
cookie `httpOnly`), arrive sur son tableau de bord présenté sous forme de
carte d'embarquement (métaphore assumée de l'identité visuelle de
l'académie), ouvre un module de sa formation, consulte les blocs de
contenu (vidéo, texte, PDF, image) d'une leçon, prend éventuellement des
notes personnelles, puis passe le quiz de fin de module. Une fois toutes
les évaluations d'une unité de formation validées, un badge de parcours
peut lui être attribué (`BadgeCode`, ex. `FIRST_MODULE`, `PERFECT_QUIZ`,
`YEAR1_VALIDATED`). Lorsque son stage est réalisé, il dépose son dossier,
suit sa validation par l'équipe pédagogique et par la signature
électronique de son tuteur, puis reçoit — une fois le cursus complet
validé — son certificat numérique, vérifiable par un tiers via un simple
code.

## 9. Communication frontend ↔ backend ↔ base de données

Le frontend appelle le backend via un client Axios centralisé
(`frontend/src/lib/api.ts`), qui transmet le cookie JWT `httpOnly` à
chaque requête ; le backend, entièrement `STATELESS` (aucune session en
mémoire), reconstruit l'identité de l'utilisateur à partir du seul jeton à
chaque appel, applique le contrôle d'accès (RBAC déclaratif via
`@PreAuthorize`, complété par des vérifications de propriété au niveau
service), délègue la logique métier à la couche `Service`, qui lit et
écrit les données via la couche `Repository` (Spring Data JPA) vers
PostgreSQL ; Redis intervient en complément pour les compteurs de
limitation de débit, sans jamais être la source de vérité des données
métier.

## 10. Gestion des données

Le modèle de données du backend compte **39 entités JPA** persistées
(`@Entity`) dans `backend/src/main/java/ma/iatacademy/api/domain/entity/`
(une quarantième classe du même répertoire, `AuditableEntity`, est une
classe technique `@MappedSuperclass` — non persistée en tant que telle
— qui porte les champs d'audit `createdAt`/`updatedAt` communs). Ces
entités couvrent une dizaine de domaines fonctionnels : identité et
sécurité, catalogue de cours, quiz et évaluation, progression et
gradebook, stage et certification, messagerie, notifications, badges,
bourse à l'emploi, campagnes email et médias.

## 11. Choix technologiques

Backend Spring Boot 3.4.5 / Java 21, PostgreSQL avec migrations Flyway,
Redis pour la limitation de débit, authentification JWT par cookie
`httpOnly` ; frontend Next.js 15 (Turbopack), TypeScript strict, Tailwind
v4. Le détail des choix et de leurs justifications figure dans les
documents dédiés (`02-architecture-et-diagrammes.md` et suivants).

## 12. Fonctionnalités à réelle valeur ajoutée

Certaines fonctionnalités dépassent le simple CRUD attendu d'une
plateforme e-learning :

- **Génération de questions de quiz par IA, avec repli entre deux
  fournisseurs.** `QuestionGenerationService` interroge Gemini en
  priorité et, en cas d'échec ou d'absence de configuration, bascule
  automatiquement sur Grok (`AiProviderProperties` : un fournisseur est
  considéré « configuré » dès que sa clé API est renseignée). Le service
  ne persiste rien lui-même : il renvoie des `CreateQuestionRequest` que
  le chemin d'ajout de question existant valide et enregistre, garantissant
  les mêmes invariants qu'une question saisie manuellement. L'appel est
  limité à 20 générations par 5 minutes et par utilisateur
  (`RateLimitService#checkAiGenerationAllowed`) pour éviter l'abus d'une
  API tierce payante. Ce qui dépasse le CRUD : la logique de repli entre
  fournisseurs, le parsing tolérant de la réponse du modèle (extraction
  du JSON même si le modèle l'entoure de balises Markdown) et la
  réutilisation stricte du chemin de validation existant plutôt qu'un
  contournement.
- **Génération d'image de badge en Java2D.** `BadgeImageService` compose
  au moment de l'obtention d'un badge une image « carte d'embarquement »
  (1200×630, format Open Graph standard) directement en Java2D — dégradé
  navy, souche façon billet d'avion, code-barres généré
  pseudo-aléatoirement à partir du code de partage, glyphe spécifique au
  type de badge — puis la met en cache sur disque pour ne jamais la
  regénérer. Ce qui dépasse le CRUD : il ne s'agit pas de servir un
  fichier statique, mais de produire dynamiquement un visuel cohérent
  avec l'identité graphique du frontend, utilisé comme aperçu lors du
  partage d'un badge sur LinkedIn.
- **Vérification publique de certificat.** `CertificateController#verify`
  et son pendant frontend `frontend/src/app/verify/[code]/page.tsx`
  permettent à un tiers (employeur, partenaire) de vérifier
  l'authenticité d'un certificat à partir d'un simple code, sans compte
  ni authentification — tout en gardant le PDF du diplôme lui-même hors
  de portée du téléchargement direct (remise physique par l'école). Ce
  qui dépasse le CRUD : la séparation délibérée entre preuve vérifiable
  publiquement (métadonnées) et document original (accès restreint).
- **Contrôle d'accès à granularité fine, au-delà du RBAC déclaratif.** Au
  contrôle par rôle (`@PreAuthorize`), s'ajoutent des vérifications de
  propriété au niveau service : `MessagingService#assertAccess` distingue
  une conversation directe (l'utilisateur doit être participant) d'un
  salon de cohorte (le staff y a toujours accès, un apprenant seulement
  s'il appartient au même groupe) ; `LessonNoteService#requireOwnNote`
  garantit qu'un apprenant ne peut modifier ou supprimer que ses propres
  notes de leçon, quel que soit l'identifiant transmis côté client. Ce
  qui dépasse le CRUD : ces règles ne peuvent pas être exprimées par une
  simple annotation de rôle — elles dépendent de la relation entre
  l'utilisateur authentifié et la ressource ciblée, et sont donc
  vérifiées explicitement dans le code métier plutôt que déléguées au
  framework de sécurité.
