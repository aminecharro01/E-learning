# 9. Scénario de démonstration — soutenance

> Ce document propose un déroulé de démonstration live pour la soutenance
> d'IAT Academy. Tous les comptes cités existent réellement dans
> `DataInitializer.java` et `DemoDataSeeder.java`
> (`backend/src/main/java/ma/iatacademy/api/config/`) — ce sont des comptes
> de test locaux (base de démo, mots de passe volontairement simples,
> aucun secret réel). Chaque étape indique le compte à utiliser, l'écran à
> ouvrir, ce qu'il faut dire, ce qu'il faut montrer précisément, et un plan
> de secours si le réseau ou un service externe ne répond pas le jour J.

## Comptes de démonstration réels

| Compte | Rôle | Mot de passe | État pré-rempli |
|---|---|---|---|
| `apprenant@iat-academy.local` | Étudiant (Yasmine Bakkali) | `Apprenant@123` | UF1 en cours (module 1 validé), dossier de stage entamé (convention école déjà déposée par la direction, rien côté apprenant — volontairement laissé incomplet pour être illustré en direct), conversation pré-remplie avec le formateur |
| `amina.benali@demo.local` | Étudiant (Amina Benali) | `Demo@1234` | UF1 terminée, UF2 démarrée, devoir déjà corrigé (17/20) |
| `youssef.idrissi@demo.local` | Étudiant (Youssef Idrissi) | `Demo@1234` | Débutant — une seule section terminée |
| `lina.cherkaoui@demo.local` | Étudiant (Lina Cherkaoui) | `Demo@1234` | Zéro progression |
| `salma.naji@demo.local` | Étudiant (Salma Naji) | `Demo@1234` | Année 1 complète, UF 5 (stage) validée, année 2 ouverte |
| `karim.ouafi@demo.local` | Étudiant (Karim Ouafi) | `Demo@1234` | Paiement/activation en attente (visible côté admin) |
| `khadija.mansouri@demo.local` | Étudiant (Khadija Mansouri) | `Demo@1234` | Parcours complet, stage + soutenance validés, **certificat émis** — seule compte alumni, seule à voir la bourse à l'emploi |
| `formateur@iat-academy.local` | Formateur (Sara Formateur) | `Formateur@123` | Crée/corrige le contenu, messagerie |
| `admin@iat-academy.local` | Admin / Directeur pédagogique (Karim Bensouda) | `Admin@123` | Validations sensibles (stage, soutenance), gestion des groupes/emplois |
| `superadmin@iat-academy.local` | Super Admin (Yasmine Aloui) | `SuperAdmin@123` | Tous les droits Admin + réglages système globaux |
| `support@demo.local` | Support (Sami Radi) | `Demo@1234` | Lecture seule statistiques, messages de contact/newsletter, joignable en direct par les apprenants |

Autres données de démo utiles : deux groupes (« Cohorte 2026-A », avec
membres et deux sessions live Google Meet/Zoom programmées ; « Cohorte
2027-A », vide) ; un devoir avec une copie non corrigée (Yasmine) et une
copie déjà notée (Amina) ; quatre offres d'emploi publiées, une en
brouillon et une expirée (réservées aux alumni, donc uniquement visibles
par Khadija).

**Important — deux points vérifiés en profondeur et volontairement
adaptés par rapport à une trame générique :**

1. **Les badges ne sont pas pré-remplis en base.** `DemoDataSeeder` écrit
   la progression directement dans les repositories (contournement
   volontaire pour aller vite au démarrage), sans jamais appeler
   `BadgeService`/`ProgressionService`. Aucun des comptes de démo ne
   possède donc de badge « prêt à montrer » au premier lancement — un
   badge doit avoir été obtenu par un vrai parcours applicatif (voir
   « Prérequis avant la soutenance »).
2. **La génération de questions par IA est une action formateur/admin**
   (`QuizController#generateQuestionsAi`, bouton « Générer avec IA » dans
   `/admin/quiz-bank`), pas une action de l'apprenant pendant la
   passation d'un quiz. Le scénario ci-dessous l'utilise donc côté
   pédagogique (créer une question) et enchaîne naturellement sur la
   correction hybride côté apprenant — ce qui reste un unique fil
   « IA → correction manuelle » cohérent et démontrable en direct.

## Étape 1 — Introduction (à dire, pas à démontrer)

*« IAT Academy est une académie marocaine de formation professionnelle
préparant aux métiers de l'aviation, de l'accueil et du tourisme —
Hôtesse de l'air/Steward, Agent d'escale, Accompagnateur touristique,
Réception hôtelière — sur un cursus de deux ans mêlant cours en
présentiel et stage en entreprise.*

*Avant cette plateforme, rien ne réunissait numériquement le contenu
pédagogique, les évaluations et le suivi de progression : impossible de
savoir en un coup d'œil où en était un apprenant, la correction des quiz
et devoirs n'était pas centralisée, et rien n'empêchait techniquement
d'accéder à du contenu avancé sans avoir validé les prérequis — alors que
certaines étapes du cursus, comme la validation du stage ou la
soutenance, exigent un jugement humain du directeur pédagogique et ne
peuvent pas se réduire à un simple critère automatique. La délivrance des
certificats, enfin, restait entièrement manuelle, sans preuve numérique
vérifiable par un employeur.*

*IAT Academy répond à ces six objectifs : représenter fidèlement la
structure Formation → Module → Leçon → Bloc de contenu ; fournir un
système d'évaluation complet (quiz à plusieurs portées, correction
automatique et manuelle convergeant vers un score unique) ; garantir un
déblocage séquentiel vérifié côté serveur ; outiller l'équipe pédagogique
d'un espace d'administration complet ; automatiser des certificats
vérifiables et le suivi du stage jusqu'à sa signature externe ; et
sécuriser transversalement la plateforme.*

*Ce que je vais montrer aujourd'hui n'est pas une maquette : chaque écran
est branché sur un vrai backend Spring Boot, une vraie base PostgreSQL, et
pour la partie IA, un vrai appel à Gemini (avec repli automatique sur
Grok). »*

## Étape 2 — Présentation de l'application

Ouvrir la page de connexion et expliquer la structure avant de se
connecter :

- **Deux espaces distincts**, chacun avec son propre layout qui fournit
  gratuitement la protection d'accès et le chrome (sidebar/header) :
  `app/**` pour l'apprenant (Étudiant) et `(admin)/admin/**` pour le
  staff (Formateur, Admin/Directeur, Super Admin, **et** Support en
  lecture seule).
- **Cinq rôles** (`Role.java`) : `ETUDIANT`, `FORMATEUR`, `ADMIN`,
  `SUPER_ADMIN`, `SUPPORT` — ce dernier étant volontairement **non
  « staff »** au sens strict du code (`Role.isStaff()` l'exclut), mais
  reste joignable en messagerie directe et lit les statistiques.
- **Deux acteurs externes sans compte** : le tuteur de stage (lien à
  usage unique pour signer électroniquement) et le visiteur public (vérifie
  un certificat ou un badge, sans authentification).
- **Fonctionnalités principales** à mentionner rapidement en survolant la
  sidebar apprenant puis la sidebar admin : catalogue de cours, quiz et
  devoirs, progression, dossier de stage, certificat, badges, messagerie,
  bourse à l'emploi, et côté staff : gestion des utilisateurs/groupes,
  correction, campagnes email, bibliothèque de médias, analytique.

*Plan de secours : si la connexion réseau au backend local est instable,
avoir un jeu de captures d'écran des deux sidebars (apprenant/admin) prêt
en local, et décrire verbalement la navigation à partir de
`docs/03-frontend.md` (§3.3, les deux shells).*

## Étape 3 — Scénario utilisateur détaillé

### 3.1 Connexion apprenant → tableau de bord

- **Compte** : `apprenant@iat-academy.local` / `Apprenant@123`.
- **Écran** : page de connexion, puis redirection automatique vers
  `/app`.
- **À dire** : le JWT est posé en cookie `httpOnly` par le backend —
  jamais lu ni stocké en JavaScript ; la redirection après connexion suit
  trois priorités (profil incomplet → onboarding, paramètre `?next=` →
  page demandée, sinon redirection par rôle).
- **À montrer** : le tableau de bord apprenant, présenté sous forme de
  carte d'embarquement (identité visuelle assumée de l'académie), avec la
  progression réelle de Yasmine — UF1 en cours, module 1 déjà validé.
- **Plan de secours** : si le backend local ne répond pas, capture d'écran
  du tableau de bord Yasmine déjà préparée, avec le commentaire « voici ce
  que verrait normalement l'apprenant ici ».

### 3.2 Navigation dans un module et une leçon

- **Écran** : `/app/modules` puis une leçon du module 1 (blocs de contenu
  texte/vidéo/PDF/image).
- **À dire** : chaque leçon est composée de blocs typés (`LessonBlock` /
  `BlockType`), le HTML des leçons passe par DOMPurify avant affichage
  (protection XSS).
- **À montrer** : une leçon déjà vue par Yasmine (module 1) pour ne pas
  perdre de temps sur du contenu non pertinent, puis mentionner
  rapidement la prise de notes personnelles (`LessonNoteService`).

### 3.3 Génération d'une question de quiz par IA (côté formateur)

- **Compte** : `formateur@iat-academy.local` / `Formateur@123` (ouvrir un
  second onglet ou une fenêtre privée pour garder Yasmine connectée en
  parallèle).
- **Écran** : `/admin/quiz-bank`, sélectionner le quiz « Quiz — Techniques
  de communication » (module 1), cliquer sur l'icône ✨ « Générer avec
  IA ».
- **À dire** : `QuestionGenerationService` interroge Gemini en priorité
  et bascule automatiquement sur Grok en cas d'échec ou d'absence de
  configuration (`AiProviderProperties` — un fournisseur est « configuré »
  dès que sa clé API est non vide). Le service ne persiste rien lui-même :
  il renvoie une liste de questions que le chemin de création existant
  valide et enregistre, avec les mêmes contraintes qu'une question saisie
  à la main. L'appel est limité à 20 générations/5 minutes par utilisateur
  (`RateLimitService`) pour éviter l'abus d'une API tierce payante.
- **À montrer** : dans le formulaire de génération, choisir le type
  **Question ouverte (ESSAY)** — celle qui sera corrigée manuellement à
  l'étape suivante — puis valider la génération, relire/ajuster
  brièvement le libellé proposé et publier le quiz.
- **Plan de secours (réseau ou API IA indisponible)** : Gemini/Grok
  peuvent être en quota ou hors ligne le jour J. Prévoir *avant* la
  soutenance une question ouverte déjà créée manuellement (même écran,
  bouton « Ajouter une question » classique) dans ce même quiz, pour
  pouvoir dire *« voici ce que la génération IA aurait produit, je
  l'illustre avec une question préparée en amont »* sans bloquer la
  démonstration. Avoir aussi une capture d'écran de la modale de
  génération réussie en réserve.

### 3.4 Passation du quiz par l'apprenant, avec question ouverte en attente

- **Compte** : revenir à `apprenant@iat-academy.local`.
- **Écran** : `/app/quiz` (ou le module), démarrer le quiz « Quiz —
  Techniques de communication ».
- **À dire** : le démarrage d'une tentative est protégé par un verrou
  PostgreSQL transactionnel (`pg_advisory_xact_lock`) qui empêche deux
  clics simultanés de créer deux tentatives.
- **À montrer** : répondre aux questions à choix (déjà connues du jeu de
  démo : reformulation → « Vérifier qu'on a bien compris le besoin »,
  timing du briefing → « Vrai ») puis rédiger une réponse libre à la
  question ouverte ajoutée à l'étape précédente, et soumettre. Le score
  affiché à l'apprenant reste partiel/en attente tant que la question
  ouverte n'est pas corrigée.
- **Plan de secours** : si la tentative précédente de Yasmine sur ce quiz
  existe déjà (relance de répétition), utiliser `youssef.idrissi@demo.local`
  ou `lina.cherkaoui@demo.local`, qui n'ont pas encore tenté ce quiz.

### 3.5 Correction hybride côté formateur — question ouverte en attente

- **Compte** : revenir à `formateur@iat-academy.local` (ou
  `admin@iat-academy.local`).
- **Écran** : `/admin/grading`.
- **À dire** : ce quiz mélange correction automatique (choix
  unique/multiple/vrai-faux) et correction manuelle (`EssayGrade`) — les
  deux convergent vers un carnet de notes commun (`Gradebook`), sans
  double système de notation parallèle.
- **À montrer** : la réponse de Yasmine apparaît dans la file d'attente ;
  saisir une note (0–100) et un commentaire, valider — la tentative
  bascule alors en score final.
- **Plan de secours** : le devoir « Fiche réflexe accueil passager » de
  Yasmine (dépôt PDF, distinct des quiz) est déjà en attente de correction
  dans `/admin/gradebook` — un filet de secours immédiat si la question
  ouverte du quiz n'apparaît pas (ex. tentative non soumise correctement).

### 3.6 Dossier de stage et validation d'une UF sensible

- **Compte** : `apprenant@iat-academy.local`.
- **Écran** : `/app/stage`.
- **À dire** : la convention école a déjà été déposée par la direction ;
  il manque encore des pièces côté apprenant — c'est un choix délibéré du
  jeu de démo pour illustrer un dépôt en direct.
- **À montrer** : déposer un document du dossier de stage (ex. rapport de
  stage) en tant que Yasmine.
- **Bascule staff** : `admin@iat-academy.local`, écran `/admin/stage` (ou
  la fiche apprenant dans `/admin/learners`) : valider l'UF « UF 5 »
  (Stage) pour Yasmine.
- **À dire** : deux des onze UF du cursus (« UF 5 » Stage et « UF 11 »
  Soutenance) exigent une validation humaine du directeur en plus des
  critères automatiques — vérifié explicitement dans
  `UfValidationService` (liste `DIRECTOR_GATED_UFS`) ; cette validation
  déclenche en cascade une notification à l'apprenant et une vérification
  transverse (`ProgressionService#checkAndAwardYearBadges`) pour savoir si
  l'année scolaire est désormais complète.
- **Plan de secours** : si le dépôt de document échoue (upload local), la
  démonstration peut sauter directement à la validation de l'UF déjà
  visible sur le compte `salma.naji@demo.local`, dont l'UF 5 est déjà
  validée en base — montrer l'état « après » sans repasser par le dépôt.

### 3.7 Certificat vérifiable publiquement + badge partagé

- **Compte** : `khadija.mansouri@demo.local` / `Demo@1234` — seul compte
  du jeu de démo avec un certificat déjà émis.
- **Écran** : `/app` (tableau de bord), repérer le bloc certificat et le
  bouton **« Ajouter au profil LinkedIn »**.
- **À dire** : le PDF du diplôme reste hors de portée du téléchargement
  direct pour l'apprenant (remise physique par l'école, seul `ADMIN` peut
  le télécharger) — mais n'importe qui peut vérifier publiquement
  l'authenticité du certificat à partir d'un simple code, sans compte ni
  authentification.
- **À montrer** : ouvrir dans un nouvel onglet `/verify/<code>` (le code
  de vérification du certificat de Khadija) — page publique, sans
  connexion — puis le bouton LinkedIn « Ajouter au profil » qui pré-remplit
  le flux officiel d'ajout de certification LinkedIn (nom de la formation,
  organisme, année, URL de vérification).
- **Badge** : si un badge a été obtenu en amont sur un compte de
  répétition (voir « Prérequis »), ouvrir `/app/profile` sur ce compte,
  cliquer sur le badge pour arriver sur `/achievements/<code>` — page
  publique avec image « carte d'embarquement » générée dynamiquement en
  Java2D (`BadgeImageService`) et bouton de partage LinkedIn (texte
  suggéré à copier, LinkedIn ne permettant pas de pré-remplir le texte
  d'un post).
- **Plan de secours** : capture d'écran de `/verify/<code>` et
  `/achievements/<code>` déjà ouvertes/imprimées, au cas où le certificat
  de démonstration aurait été régénéré entre-temps (le code change si la
  base est réinitialisée) — toujours vérifier le code exact juste avant
  la soutenance plutôt que de le mémoriser à l'avance.

### 3.8 Statistiques et tableau de bord staff

- **Compte** : `admin@iat-academy.local` (ou `support@demo.local` pour
  montrer l'accès lecture seule).
- **Écran** : `/admin` (tableau de bord Directeur) puis `/admin/learners`
  ou `/admin/users`.
- **À dire** : trois tableaux de bord staff différents selon le rôle
  exact (`DirecteurDashboard`, `FormateurDashboard`, `SupportDashboard`) —
  le composant ne fait que choisir l'affichage, la vraie barrière de
  sécurité reste `@PreAuthorize` côté Spring Boot. `SUPPORT` voit les
  statistiques mais aucune action de modification.
- **À montrer** : la fiche de Karim Ouafi (paiement/activation en
  attente) pour illustrer la gestion des comptes, puis les deux groupes
  (Cohorte 2026-A avec sessions live programmées, Cohorte 2027-A vide).

### 3.9 Fonctionnalité avancée — messagerie et assistant de cours IA

- **Messagerie support** : connecté en `apprenant@iat-academy.local`,
  ouvrir `/app/messages`, démarrer une nouvelle conversation directe avec
  `support@demo.local` (Sami Radi) — montrer que `SUPPORT`, bien que non
  « staff » au sens du code, reste explicitement joignable en direct
  (`MessagingService#isMessagingEligible`). Mentionner en une phrase la
  conversation déjà pré-remplie apprenant ↔ formateur, visible côté
  `/admin/messages`.
- **Assistant de cours (optionnel, si le temps le permet)** : sur une
  leçon du module 1, ouvrir le widget de chat (`ChatbotWidget`) et poser
  une question sur le contenu affiché — l'assistant (`CourseAssistantService`,
  même repli Gemini → Grok) répond uniquement à partir du contenu déjà
  publié et déjà débloqué pour cet apprenant, jamais au-delà.
- **Plan de secours** : si le temps manque, ne garder que la messagerie
  support (30 secondes) et sauter l'assistant de cours — le mentionner
  brièvement à l'oral en renvoyant vers `08-services-externes.md`.

## Minutage indicatif (démonstration live : 5 à 8 minutes)

| Étape | Durée | Cumul |
|---|---|---|
| 3.1 Connexion + tableau de bord apprenant | 30 s | 0:30 |
| 3.2 Navigation module/leçon | 30 s | 1:00 |
| 3.3 Génération de question IA (formateur) | 1 min | 2:00 |
| 3.4 Passation du quiz (apprenant) | 1 min | 3:00 |
| 3.5 Correction hybride (formateur) | 45 s | 3:45 |
| 3.6 Dossier de stage + validation UF sensible | 1 min 15 | 5:00 |
| 3.7 Certificat vérifiable + badge partagé | 1 min | 6:00 |
| 3.8 Statistiques/dashboard staff | 45 s | 6:45 |
| 3.9 Messagerie support (+ assistant IA si le temps le permet) | 45 s à 1 min 15 | 7:30–8:00 |

Cohérent avec une soutenance totale de 15–20 minutes : environ 5 minutes
d'introduction/conclusion orale (étape 1 + questions du jury), 5 à 8
minutes de démonstration live ci-dessus, le reste en questions/réponses
techniques (voir les sections « Questions possibles du jury » de
`03-frontend.md`, `04-backend.md` et `08-services-externes.md`).

## Prérequis avant la soutenance

**À lancer, dans l'ordre :**

1. `docker compose up -d` à la racine du repo (PostgreSQL sur le port
   `5433`, Redis sur `6379` — voir `docker-compose.yml`). Attendre que les
   deux `healthcheck` passent au vert.
2. Backend : `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
   depuis `backend/` (port `8080` par défaut). Vérifier dans les logs de
   démarrage la ligne `Demo ready — scénarios: ...` qui confirme que
   `DemoDataSeeder` a bien tourné et récapitule les comptes.
3. Frontend : `npm run dev` depuis `frontend/` (port `3000` par défaut,
   Turbopack).
4. Se connecter une fois avec chacun des comptes clés (apprenant,
   formateur, admin) pour vérifier que la session fonctionne et que rien
   n'a changé depuis la dernière session de démo.

**Vérifier la configuration IA avant la soutenance :**

- Dans `backend/.env` (copié depuis `.env.example`), vérifier si
  `GEMINI_API_KEY` et/ou `GROK_API_KEY` sont renseignées. Un fournisseur
  est considéré « configuré » dès que sa clé est non vide — aucun flag
  séparé à activer.
- **Si aucune clé n'est configurée ou si le quota est épuisé le jour J** :
  la génération de questions (`/admin/quiz-bank`) et l'assistant de cours
  échoueront proprement avec un message d'erreur explicite (pas de
  crash) — mais pour ne pas improviser devant le jury, préparer à
  l'avance une question ouverte créée manuellement dans le même quiz (voir
  plan de secours §3.3) et sauter l'assistant de cours (§3.9, optionnel).
- Tester la génération IA **la veille**, pas seulement au moment de
  rédiger ce document — un quota Gemini/Grok peut s'épuiser entre-temps.

**Préparer au moins un badge réellement gagné (pas seulement seedé) :**

- `DemoDataSeeder` écrit la progression directement en base, sans jamais
  appeler `BadgeService` — aucun badge n'existe donc « par défaut ».
  Avant la soutenance, se connecter une fois en tant que
  `youssef.idrissi@demo.local` (un seul module à terminer pour un badge
  « Premier module ») ou `lina.cherkaoui@demo.local`, terminer réellement
  les leçons restantes du module 1 et réussir le quiz de fin de module via
  l'interface (pas via la base) pour que `FIRST_MODULE` (et éventuellement
  `PERFECT_QUIZ` avec un 100%) soit effectivement attribué et visible sur
  `/app/profile` → `/achievements/<code>` le jour de la soutenance.
- Noter le `shareCode` obtenu (visible dans l'URL de la page de partage)
  pour ne pas le chercher en direct devant le jury.

**Réinitialisation des données de démo :**

- Le comportement de `DemoDataSeeder` dépend de
  `app.demo.reset-progress-on-startup` (`application.yml`, `true` par
  défaut) : à chaque redémarrage du backend, la progression et les
  documents de stage sont réinitialisés puis reseedés — **y compris le
  badge préparé au point précédent**, si le backend est redémarré après
  l'avoir obtenu. Mettre ce flag à `false` (ou utiliser une variable
  d'environnement dédiée) avant la soutenance si le backend doit être
  redémarré entre la préparation du badge et la soutenance elle-même,
  pour ne pas perdre le travail de préparation.

**Plan de secours général :**

- Avoir une capture d'écran de chaque étape critique (tableau de bord
  apprenant, modale de génération IA réussie, `/admin/grading` avec une
  question en attente, `/verify/<code>` et `/achievements/<code>`) dans un
  dossier local, au cas où le réseau, le backend ou un service externe
  ferait défaut pendant la présentation.
- Répéter le scénario complet au moins une fois dans les 24h précédant la
  soutenance, dans les conditions réelles (même machine, même réseau) —
  plusieurs étapes (validation UF, dépôt de document, badge) modifient
  un état qui ne se « répète » pas à l'identique sans un redémarrage du
  backend (voir point précédent sur le reset de progression).

## Fonctionnalités du scénario non vérifiées avec certitude

- Le comportement exact de `getPendingReviewAttempts` / `/admin/grading`
  quand **plusieurs** questions ouvertes sont en attente pour une même
  tentative n'a pas été testé en conditions réelles dans le cadre de la
  rédaction de ce document (lecture du code uniquement, pas d'exécution).
- Le temps de réponse réel de Gemini/Grok en génération de questions n'a
  pas été mesuré en direct — prévoir une marge dans le minutage (§3.3) au
  cas où l'appel prendrait plusieurs secondes.
- L'upload d'un document de stage depuis `/app/stage` (taille de fichier
  acceptée, formats) n'a pas été testé en conditions réelles dans le cadre
  de cette rédaction — vérifier avec un vrai petit PDF avant la
  soutenance plutôt que le jour même.
