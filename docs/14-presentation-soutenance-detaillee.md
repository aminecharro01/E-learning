# 14. Contenu détaillé de la présentation de soutenance

> Document préparé à partir de l'état réel et actuel du projet (`/graphify`
> mis à jour le 2026-09-12, code source vérifié directement — voir
> `docs/01` à `docs/13`). Aucune fonctionnalité non implémentée n'est
> présentée. Chaque diagramme cité correspond au code confronté ligne par
> ligne (`docs/02-architecture-et-diagrammes.md`). Ce document est le
> script complet, slide par slide, d'une soutenance académique — pas une
> présentation commerciale.

---

## Plan global de la soutenance

**Slide 1 —** Page de garde
**Slide 2 —** Plan de la présentation
**Slide 3 —** Présentation de l'organisme d'accueil
**Slide 4 —** Contexte
**Slide 5 —** Problématique
**Slide 6 —** Solution proposée
**Slide 7 —** Objectifs du projet
**Slide 8 —** Besoins fonctionnels
**Slide 9 —** Besoins non fonctionnels
**Slide 10 —** Diagramme de cas d'utilisation
**Slide 11 —** Diagramme de classes (vue d'ensemble)
**Slide 12 —** Diagramme de séquence 1 — Génération de questions par IA avec repli
**Slide 13 —** Diagramme de séquence 2 — Progression séquentielle et cascade vers le certificat
**Slide 14 —** Architecture et choix techniques
**Slide 15 —** Design, charte graphique et expérience utilisateur
**Slide 16 —** Fonctionnalités principales — vue d'ensemble
**Slide 17 —** Focus différenciant — Badges de progression
**Slide 18 —** Focus différenciant — Messagerie à accès cloisonné
**Slide 19 —** Focus différenciant — Assistant de cours IA (chatbot)
**Slide 20 —** DÉMONSTRATION
**Slide 21 —** Bilan
**Slide 22 —** Perspectives
**Slide 23 —** Conclusion et remerciements

---

### Slide 1 — Page de garde

**Objectif :** identifier immédiatement le projet, l'auteur et le cadre académique.

**Contenu à afficher :**
- *Conception et développement d'une solution e-learning dédiée aux métiers de l'aviation, de l'accueil et du tourisme pour IAT Academy*
- Amine Charro — Développement Digital et Systèmes d'Information, 4ᵉ année, EMSI
- Encadrante académique : Mme. El Amrani Nora (EMSI)
- Organisme d'accueil : IAT Academy, Casablanca
- Année universitaire 2025–2026

**Éléments visuels :** logos EMSI + IAT Academy, palette navy/or de l'application.

**À expliquer à l'oral :** se présenter, remercier le jury, annoncer le plan en une phrase.

**Questions potentielles du jury :** aucune à ce stade — slide de transition.

---

### Slide 2 — Plan de la présentation

**Objectif :** donner au jury une carte de lecture de la soutenance.

**Contenu à afficher :** 5 grandes parties — Contexte → Conception → Réalisation → Démonstration → Bilan, sous forme de frise ou de sommaire numéroté.

**Éléments visuels :** stepper horizontal ou sommaire simple.

**À expliquer à l'oral :** *« Je vais suivre une progression logique : pourquoi ce projet, comment il a été conçu, ce qui a été réalisé concrètement, une démonstration live, puis le bilan et les perspectives. »*

**Questions potentielles du jury :** aucune.

---

### Slide 3 — Présentation de l'organisme d'accueil

**Objectif :** permettre au jury de comprendre où, pourquoi et dans quel contexte le projet a été réalisé.

**Contenu à afficher :**
- **IAT Academy** — International Airlines and Tourism Academy (الأكاديمية الدولية للطيران والسياحة)
- Centre de formation professionnelle basé à Casablanca
- Domaine : métiers de l'aviation, de l'accueil et du tourisme
- Filières : Personnel Navigant Commercial (hôtesses/stewards), agents d'escale, réception hôtelière, accompagnateurs touristiques
- Cursus professionnel de 2 ans, forte exigence d'employabilité immédiate
- Cadre du stage : développement seul, en lien direct avec l'équipe pédagogique (pas de DSI interne préexistante — le poste occupé a consisté à en constituer la première brique numérique)

**Éléments visuels :** logo IAT Academy, éventuellement une carte ou une photo générique du secteur aéronautique/tourisme (libre de droits, pas de fausse photo de l'école).

**À expliquer à l'oral :** insister sur le fait que le cursus ne se limite pas à la théorie — gestes métier, stage obligatoire, soutenance finale.

**Questions potentielles du jury :**
- *Quel était votre statut exact au sein de l'organisme (stagiaire seul, équipe) ?* → Développeur unique du projet, en lien direct et continu avec l'équipe pédagogique de l'académie, sans équipe technique préexistante à rejoindre.

---

### Slide 4 — Contexte

**Objectif :** poser le terrain avant la problématique.

**Contenu à afficher :**
- Avant ce projet : contenu de cours, évaluations et suivi de progression dispersés, aucun LMS
- Demande croissante de formation à distance, notamment pour les apprenants ne résidant pas à Casablanca et ne pouvant pas suivre facilement un présentiel
- Situation courante dans les établissements de formation professionnelle de taille intermédiaire

**Éléments visuels :** aucun schéma nécessaire — texte court, 3 puces maximum.

**À expliquer à l'oral :** relier directement ce constat à la mission confiée pour le stage.

**Questions potentielles du jury :**
- *Comment avez-vous identifié ces problèmes — entretiens, observation ?* → Échanges directs et réguliers avec l'équipe pédagogique de l'académie tout au long du stage, en particulier pour traduire des règles métier parfois implicites (ex. distinction cohortes/apprenants autonomes).

---

### Slide 5 — Problématique

**Objectif :** formuler une problématique unique, précise, qui justifie tous les choix de conception suivants.

**Contenu à afficher (citation centrale) :**
> *Comment structurer, sécuriser et automatiser le parcours pédagogique complet d'un apprenant — de l'inscription à la délivrance du certificat — tout en respectant des règles métier qui ne se réduisent jamais à de simples critères automatiques, puisque certaines étapes-clés (stage, soutenance) exigent explicitement l'implication du Directeur pédagogique ?*

**Sous-problématiques concrètes identifiées :**
- Aucune vue d'ensemble en temps réel de la progression d'un apprenant
- Évaluations non centralisées, corrections hétérogènes
- Aucun mécanisme fiable empêchant l'accès à du contenu avancé sans validation des prérequis
- Certificats délivrés manuellement, sans preuve numérique vérifiable

**Éléments visuels :** la citation en encadré (carte de couleur navy), les 4 sous-points en dessous.

**À expliquer à l'oral :** c'est la tension automatisation/jugement humain qui a guidé toute la conception (chapitre 3 du rapport) — pas la seule numérisation d'un contenu de cours.

**Questions potentielles du jury :**
- *Cette problématique n'est-elle pas trop générale pour un LMS ?* → Elle est volontairement centrée sur la tension entre automatisation et validation humaine obligatoire, qui est la contrainte réellement structurante de ce cursus précis — pas un LMS générique.

---

### Slide 6 — Solution proposée

**Objectif :** répondre directement à la problématique par la solution développée.

**Contenu à afficher :**
- Une plateforme e-learning complète (backend Spring Boot + frontend Next.js), destinée à 5 profils internes (apprenants, formateurs, directeur, super admin, support) et 2 acteurs externes sans compte (tuteur de stage, recruteur/public)
- Structure fidèle du cursus réel : Formation → Année → UF → Module → Leçon → Bloc de contenu
- Déblocage séquentiel vérifié côté serveur, jamais seulement suggéré côté interface
- Certificats numériquement vérifiables, partageables sur LinkedIn

**Éléments visuels :** schéma simple *Problème → Solution* en deux colonnes.

**À expliquer à l'oral :** présenter la solution comme une réponse directe à chacune des 4 sous-problématiques du slide précédent.

**Questions potentielles du jury :**
- *Pourquoi une plateforme sur mesure plutôt qu'un LMS du marché (Moodle, etc.) ?* → Les règles métier réelles (portées de quiz à 4 niveaux, gate manuel du Directeur sur 2 UF précises, signature externe sans compte) ne correspondent à aucun paramétrage standard de LMS généraliste — les reproduire par-dessus un outil existant aurait été plus coûteux que les développer nativement.

---

### Slide 7 — Objectifs du projet

**Objectif :** formaliser ce que le projet devait produire concrètement.

**Contenu à afficher :**

**Objectif général**
> Concevoir et développer une plateforme e-learning complète qui automatise le parcours pédagogique tout en respectant les validations humaines obligatoires.

**Objectifs spécifiques**
1. Modéliser fidèlement le cursus réel (Formation → Année → UF → Module → Leçon → Bloc)
2. Mettre en place un système d'évaluation à 4 portées (section/module/UF/année), correction auto + manuelle
3. Garantir un déblocage séquentiel du contenu vérifié côté serveur
4. Fournir un espace d'administration pédagogique complet
5. Automatiser la délivrance de certificats vérifiables et le suivi du stage jusqu'à signature externe
6. Sécuriser transversalement la plateforme et la rendre déployable de façon reproductible

**Éléments visuels :** grille 2×3 ou liste numérotée compacte.

**À expliquer à l'oral :** rappeler que ces 6 objectifs seront retrouvés un par un dans les slides de réalisation.

**Questions potentielles du jury :**
- *Tous ces objectifs ont-ils été atteints ?* → Oui, les 6 sont implémentés et vérifiés ; 3 limites précises restent assumées et documentées (voir slide Bilan), qui sont des pistes d'amélioration court terme, pas des objectifs manqués.

---

### Slide 8 — Besoins fonctionnels

**Objectif :** synthétiser les besoins fonctionnels par grandes catégories.

**Contenu à afficher (regroupé, pas une longue liste) :**
- **Comptes & accès** — authentification (2FA optionnelle), rôles, profils
- **Contenu pédagogique** — catalogue de cours, éditeur par blocs, notes personnelles, commentaires par leçon
- **Évaluation** — quiz à 4 portées, correction automatique + manuelle, devoirs notés
- **Progression & certification** — déblocage séquentiel, validation manuelle des UF sensibles, certificat vérifiable
- **Stage & emploi** — dossier de stage, signature externe, bourse à l'emploi réservée aux diplômés
- **Communication & administration** — messagerie, notifications, campagnes email, gestion des utilisateurs/groupes/audit

**Éléments visuels :** 6 blocs/cartes, une icône par catégorie.

**À expliquer à l'oral :** ne pas lire la liste — dire une phrase par catégorie.

**Questions potentielles du jury :**
- *Combien de cas d'utilisation cela représente-t-il concrètement ?* → 31 contrôleurs REST, 179 points d'accès API, détaillés dans le diagramme de cas d'utilisation (slide 10).

---

### Slide 9 — Besoins non fonctionnels

**Objectif :** montrer la rigueur d'ingénierie au-delà du seul fonctionnel.

**Contenu à afficher :**
| Exigence | Traduction concrète |
|---|---|
| Sécurité | JWT en cookie httpOnly, RBAC + contrôle de propriété par ressource, 2FA optionnelle |
| Fiabilité | Règles de progression toujours vérifiées côté serveur |
| Anti-abus | Limitation de débit Redis (connexions, appels IA) |
| Scalabilité | Backend stateless — aucune session en mémoire |
| Maintenabilité | Architecture en couches stricte, migrations Flyway versionnées, 151 tests automatisés |
| Portabilité | Conteneurisation Docker, configuration 100% par variables d'environnement |

**Éléments visuels :** tableau à 2 colonnes, coloration douce.

**À expliquer à l'oral :** *« Ce ne sont pas des vœux pieux — chacune a une traduction technique précise que je peux montrer dans le code. »*

**Questions potentielles du jury :**
- *Pourquoi le backend est-il stateless ?* → L'authentification est reconstruite à chaque requête à partir du seul jeton JWT — aucune session serveur en mémoire, ce qui simplifie la scalabilité horizontale (plusieurs instances backend sans partage d'état).

---

### Slide 10 — Diagramme de cas d'utilisation

**Objectif :** montrer en un coup d'œil tous les acteurs et leurs interactions.

**Contenu à afficher :** le diagramme `diagrammes/images/diagramme_cas_utilisation.png` (7 acteurs : Visiteur, Utilisateur connecté, Étudiant, Formateur, Admin/Directeur, Super Admin, **Support** — ce dernier ajouté et vérifié le 2026-09-12 ; hiérarchie de généralisation UML ; relations `include`/`extend`).

**Éléments visuels :** le diagramme en plein écran, éventuellement zoomé sur un paquetage si la résolution le permet.

**À expliquer à l'oral :** préciser que la hiérarchie d'acteurs (`Étudiant --|> User`, etc.) est une convention UML de modélisation des permissions — le vrai code utilise un `enum Role` plat à 5 valeurs, pas une hiérarchie de classes (impossible pour un enum Java).

**Questions potentielles du jury :**
- *Le rôle Support a-t-il les mêmes droits qu'un Formateur ?* → Non, volontairement : `Role.isStaff()` exclut explicitement `SUPPORT` — il est joignable en messagerie directe et a un accès en lecture seule à certaines statistiques, mais aucun droit pédagogique ni d'administration.
- *Pourquoi 31 contrôleurs et pas un seul contrôleur générique ?* → Un contrôleur par domaine fonctionnel cohérent (quiz, stage, messagerie, etc.), chacun ne faisant que routing/`@PreAuthorize`/traduction DTO — la logique métier vit exclusivement dans la couche service.

---

### Slide 11 — Diagramme de classes (vue d'ensemble)

**Objectif :** expliquer la structure générale du modèle de données.

**Contenu à afficher :** le diagramme `diagramme_classes_ensemble.png` — 39 entités JPA concrètes réparties en 9 domaines fonctionnels (comptes/sécurité, structure pédagogique, contenu/médias, évaluation, progression/certification, groupes, communication, stage/emploi, gamification).

**Éléments visuels :** le diagramme en plein écran ; éventuellement un tableau récapitulatif en aparté (`docs/05-base-de-donnees.md`).

**À expliquer à l'oral :** mettre en avant UN choix de modélisation fort plutôt que de tout décrire : *« L'Unité de Formation (UF) n'est pas une table dédiée — c'est un simple attribut indexé (`ufCode`) sur `ModuleEntity`. Sa progression est calculée dynamiquement en couche service, ce qui évite des jointures coûteuses tout en restant fidèle à la réalité métier. »*

**Questions potentielles du jury :**
- *Pourquoi ne pas avoir une table `UniteFormation` à part entière ?* → Une UF est une agrégation de modules partageant un même code, jamais une entité manipulée indépendamment de ses modules — en faire une table dédiée aurait ajouté une jointure systématique sans bénéfice métier réel.
- *Comment garantissez-vous l'intégrité référentielle ?* → Contraintes de clé étrangère PostgreSQL + migrations Flyway versionnées (45 migrations, jamais modifiées après déploiement).
- *Le diagramme montre `JobOffer ..> Certificate : vérifie l'éligibilité`. Est-ce une convention UML ou une vraie dépendance de code ?* → Une vraie dépendance : `JobOfferService.listForLearner()` calcule `boolean isAlumni = certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID).isPresent();` et lève `ForbiddenException("Réservé aux diplômés.")` si `!isAlumni`. Le Javadoc de la classe précise explicitement que le statut « alumni » n'est **pas** un champ dédié sur `User` — il est dérivé à la volée de l'existence d'un certificat, pour ne jamais dupliquer un état qui pourrait diverger de la réalité (ex. un certificat révoqué).

---

### Slide 12 — Diagramme de séquence 1 : Génération de questions par IA avec repli

**Objectif :** montrer un scénario technique représentatif de la résilience du système.

**Pourquoi ce scénario :** il illustre à la fois l'intégration d'un service IA externe et une gestion d'échec à deux niveaux — rarement montré dans un projet étudiant.

**Contenu à afficher :** le diagramme `diagramme_sequence_generation_questions_ia.png` — Formateur → `QuizController` → `RateLimitService` (quota) → `QuestionGenerationService` → Gemini (prioritaire) → échec → Grok (repli) → validation identique à une question manuelle → persistance.

**Éléments visuels :** le diagramme complet ; surligner en direct les 2 points de décision (quota, repli).

**À expliquer à l'oral :** *« Une panne externe n'arrête jamais le formateur — le système bascule automatiquement vers un second fournisseur, et échoue explicitement seulement si les deux sont indisponibles. »*

**Questions potentielles du jury :**
- *Pourquoi Gemini en premier et pas Grok ?* → Choix de configuration (`AiProviderProperties`), pas une contrainte technique — un fournisseur est considéré « configuré » dès que sa clé API est non vide, sans drapeau `enabled` séparé, ce qui évite un état incohérent (activé mais inutilisable).
- *Comment testez-vous ce repli sans consommer un vrai appel API payant ?* → Les méthodes `callGemini`/`callGrok` sont volontairement `package-private` (pas `private`), simulées par `Mockito.spy()` dans les tests — jamais de vrai appel réseau en test.

---

### Slide 13 — Diagramme de séquence 2 : Progression séquentielle et cascade vers le certificat

**Objectif :** montrer la logique métier la plus structurante du projet — l'articulation automatisation/validation humaine.

**Pourquoi ce scénario :** c'est directement la traduction technique de la problématique du slide 5.

**Contenu à afficher :** le diagramme `diagramme_sequence_progression_uf_certificat.png`, **corrigé le 2026-09-12** en deux fragments distincts :
1. *Déverrouillage séquentiel du module suivant* — `isModuleAccessible` → `isUfFullyDone` → `UfValidationService.isValidated` (c'est ICI que le gate du Directeur, UF 5 et UF 11 uniquement, est réellement vérifié).
2. *Réussite du dernier module et émission du certificat* — `tryIssueIfEligible` ne fait que constater que tous les modules sont déjà marqués complétés (le gate a déjà été franchi en amont).

**Éléments visuels :** le diagramme complet, avec la note explicite déjà présente dans le `.puml`.

**À expliquer à l'oral :** *« Ce diagramme a lui-même fait l'objet d'un audit croisé avec le code — une première version plaçait la vérification du Directeur au mauvais endroit de la chaîne d'appels. Je l'ai corrigé après l'avoir identifié, ce qui illustre la rigueur de vérification appliquée à l'ensemble du projet, pas seulement au code. »* (C'est un excellent point à assumer, pas à cacher — voir `docs/11-questions-jury.md`.)

**Questions potentielles du jury :**
- *Un apprenant peut-il obtenir un certificat sans que le Directeur ait validé le stage ?* → Non — impossible en pratique : les modules suivant une UF gatée restent verrouillés tant qu'`isUfFullyDone` ne renvoie pas vrai, donc `tryIssueIfEligible` ne peut jamais voir « tous les modules complétés » sans que la validation ait eu lieu.
- *Que se passerait-il si on supprimait manuellement une validation d'UF en base après coup ?* → Le certificat resterait émis à tort dans ce cas précis (`tryIssueIfEligible` ne revérifie pas `UfValidationService` au moment de l'émission elle-même) — limite assumée, correctif possible : une vérification défensive supplémentaire à l'émission.

---

### Slide 14 — Architecture et choix techniques

**Objectif :** expliquer l'architecture globale et justifier chaque choix technologique (pas une liste).

**Contenu à afficher :**
- Architecture en couches : Frontend (Next.js 15, SSR) ↔ API REST (Spring Boot 3, Controller → Service → Repository) ↔ Données (PostgreSQL 16 + Redis 7), reverse proxy Nginx (topologie cible)

| Technologie | Rôle | Justification |
|---|---|---|
| Spring Boot 3 / Java | Backend, logique métier | Écosystème mature, sécurité et accès aux données intégrés, adapté à des règles de progression complexes |
| PostgreSQL 16 + Flyway | Persistance structurée | Base relationnelle fiable, migrations versionnées reproductibles entre environnements |
| Redis 7 | Débit, verrous, sessions quiz | Données volatiles à courte durée de vie, sans alourdir PostgreSQL |
| JWT + cookie httpOnly | Authentification | Sans état, compatible frontend découplé, jeton jamais exposé au JavaScript (anti-XSS) |
| Next.js 15 | Frontend | Rendu serveur pour les pages publiques (SEO/Open Graph — ex. certificat) |
| Docker / Docker Compose | Déploiement | Conteneurisation reproductible du backend et de ses dépendances |

**Éléments visuels :** schéma en couches (`diagramme_architecture.png`) + le tableau.

**À expliquer à l'oral :** choisir 2 lignes du tableau à développer oralement (Redis et JWT sont les plus riches à justifier), ne pas lire les 6.

**Questions potentielles du jury :**
- *Pourquoi Redis en plus d'une base relationnelle déjà présente ?* → Les compteurs de débit, verrous d'édition et tentatives de quiz sont des données à très courte durée de vie et à fort taux d'écriture — les stocker dans PostgreSQL aurait ajouté une charge inutile sur la base de vérité durable.
- *Pourquoi un rendu serveur (SSR) pour une seule page ?* → Le robot d'indexation de LinkedIn n'exécute pas de JavaScript — sans SSR, l'aperçu Open Graph de la page de certificat ne s'afficherait jamais correctement lors d'un partage.

---

### Slide 15 — Design, charte graphique et expérience utilisateur

**Objectif :** montrer que le projet ne se limite pas au backend.

**Contenu à afficher :**
- Palette : navy `#142B4B` (marque, structure) + or `#E08D1B`→`#C97612` (accent, dégradé « wing »)
- Typographie : Poppins (titres), Inter (corps), JetBrains Mono (code/données)
- Composants signature : carte « boarding pass » (badges, cartes de cours), coins arrondis 12px, ombre de marque unique
- Deux shells distincts (apprenant `/app`, staff `/admin`) partageant le même moteur d'auth mais un chrome différent selon le rôle
- Mode sombre + 2 thèmes alternatifs sélectionnables par le Super Admin (Océan Sarcelle, Coucher de soleil Ambre)

**Éléments visuels :** captures d'écran réelles (dashboard apprenant, carte boarding pass d'un badge), pas de maquette.

**À expliquer à l'oral :** le motif « carte d'embarquement » n'est pas décoratif — il reprend le vocabulaire visuel du secteur (aviation) directement dans l'identité de marque de l'app.

**Questions potentielles du jury :**
- *Le design a-t-il été fait par vous seul ?* → Oui, système de design construit et documenté (`docs/charte-graphique.html`), dérivé directement des tokens CSS réels de l'application, pas une maquette a posteriori.

---

### Slide 16 — Fonctionnalités principales — vue d'ensemble

**Objectif :** donner une vue synthétique avant les zooms différenciants.

**Contenu à afficher (Problème → Fonctionnalité → Valeur, condensé) :**
- **Authentification & rôles** — 5 rôles internes + 2FA → accès strictement scopé par profil
- **Catalogue de cours** — éditeur par blocs (texte/PDF/vidéo/image) → contenu structuré, pas de fichiers en vrac
- **Quiz à 4 portées** — section/module/UF/année, correction auto + manuelle → un seul score final toujours cohérent
- **Stage & certification** — dossier, signature externe, certificat vérifiable → preuve numérique, pas un PDF statique
- **Bourse à l'emploi** — réservée aux diplômés → statut jamais désynchronisé de la réalité
- **Messagerie & notifications** — cloisonnées par rôle → aucune fuite d'accès

**Éléments visuels :** grille de 6 cartes courtes, une icône chacune.

**À expliquer à l'oral :** annoncer que les 3 slides suivants creusent les fonctionnalités les plus différenciantes.

**Questions potentielles du jury :** aucune — slide de transition, les questions viendront sur les focus suivants.

---

### Slide 17 — Focus différenciant : Badges de progression

**Objectif :** montrer une fonctionnalité de gamification réellement intégrée au système, pas un gadget.

**Contenu à afficher :**
- 7 badges réels : Premier module, Sans faute, Stage validé, Profil complété, Premier message (forum), **Année 1 validée**, **Année 2 validée**
- Attribution 100% automatique par `ProgressionService`/`BadgeService` — jamais manuelle
- Chaque badge génère une image « carte d'embarquement » en **Java2D**, sans dépendance externe, servie publiquement (`/achievements/[code]`) pour un partage LinkedIn/réseaux

**Éléments visuels :** capture de la page publique de badge partagé.

**À expliquer à l'oral :** *« Ce n'est pas un simple badge visuel — l'image elle-même est composée à la volée côté serveur (`Graphics2D`), pas une bibliothèque tierce. »*

**Questions potentielles du jury :**
- *Comment le badge « Année 1 validée » est-il déclenché exactement ?* → `ProgressionService.checkAndAwardYearBadges()`, appelée à trois points d'entrée distincts (mise à jour de progression, validation d'UF par le Directeur, signature du tuteur externe) — jamais un cron ni une action manuelle.
- *Pourquoi Java2D plutôt qu'une lib externe de génération d'image ?* → Éviter une dépendance et un appel réseau supplémentaires pour une image relativement simple — le rendu reste entièrement maîtrisé et sans coût récurrent.

---

### Slide 18 — Focus différenciant : Messagerie à accès cloisonné

**Objectif :** montrer un principe de sécurité transversal illustré par une fonctionnalité concrète.

**Contenu à afficher :**
- Qui peut parler à qui : apprenant ↔ formateur/support (direct), salons de cohorte pour le staff — jamais apprenant ↔ apprenant
- Contrôle de propriété systématique en plus du RBAC (`MessagingService.assertAccess`) — ferme une classe de vulnérabilités IDOR que le rôle seul ne couvre pas
- Annuaire « Support » distinct de celui des formateurs, épinglé séparément côté apprenant

**Éléments visuels :** capture des deux annuaires côte à côte (support / formateurs).

**À expliquer à l'oral :** relier explicitement à la sécurité (slide 9) — ce n'est pas qu'une fonctionnalité de confort.

**Questions potentielles du jury :**
- *Le RBAC ne suffit-il pas à protéger la messagerie ?* → Non : un rôle dit *qu'un* apprenant peut lire ses messages, jamais *lequel* — sans la vérification de propriété en couche service, un utilisateur authentifié pourrait accéder à la conversation d'un autre en devinant un identifiant dans l'URL.

---

### Slide 19 — Focus différenciant : Assistant de cours IA (chatbot)

**Objectif :** présenter l'IA comme une fonctionnalité intégrée au système, pas un ajout superficiel.

**Contenu à afficher :**
- Rôle : répondre aux questions de l'apprenant sur le contenu déjà publié **et déjà débloqué pour lui** — jamais sur du contenu verrouillé ou futur
- Widget flottant sur tout l'espace apprenant (`ChatbotWidget.tsx`)
- Recherche par mots-clés sur le contenu de cours (RAG léger), avec le même repli Gemini → Grok que la génération de questions
- Limite assumée : pas de recherche sémantique vectorielle — un mot-clé absent du texte source ne sera pas trouvé

**Éléments visuels :** capture du widget ouvert avec une vraie question/réponse.

**À expliquer à l'oral :** insister sur la contrainte de sécurité pédagogique : *« L'assistant ne peut jamais devenir un raccourci vers du contenu que l'apprenant n'a pas encore le droit de voir — la même logique de déblocage séquentiel s'applique ici aussi. »*

**Questions potentielles du jury :**
- *Pourquoi ne pas utiliser une base vectorielle pour une vraie recherche sémantique ?* → Choix de simplicité assumé pour le périmètre du stage — le volume de contenu par formation reste modeste, une extraction par mots-clés suffit ; une base vectorielle est une perspective d'évolution si le catalogue grossit significativement.

---

### Slide 20 — DÉMONSTRATION

**Objectif :** simple slide de transition — ne pas surcharger.

**Contenu à afficher :** le mot **DÉMONSTRATION**, rien d'autre (éventuellement un sous-titre discret : « Application en conditions réelles »).

**Éléments visuels :** fond navy plein, typographie large.

**Scénario de démonstration (voir `docs/09-scenarios-demonstration.md` pour le détail minute par minute) :**
1. Connexion apprenant (Yasmine) → tableau de bord, badge déjà visible
2. Correction hybride en direct (Amina) → notation d'une vraie question ouverte, cascade observée en direct (module complété, notifications)
3. Badge « Année 1 validée » (Salma) → page publique de partage
4. Certificat vérifiable + LinkedIn (Khadija) → `/verify/[code]`
5. Bourse à l'emploi réservée aux diplômés

**À expliquer à l'oral :** annoncer le fil rouge avant de basculer sur l'application réelle : *« Je vais vous montrer 4 comptes à des étapes différentes du même parcours, pour couvrir plusieurs situations en quelques minutes. »*

**Questions potentielles du jury :** aucune ici — les questions viendront pendant/après la démo elle-même.

---

### Slide 21 — Bilan

**Objectif :** dresser un bilan chiffré et honnête.

**Contenu à afficher :**
- 39 entités JPA · 31 contrôleurs REST · 179 points d'accès · 151 tests automatisés · 7 badges
- Apports techniques : conception de domaine complexe, intégration IA résiliente, sécurité API à plusieurs niveaux
- **3 limites assumées, documentées, pas dissimulées :**
  1. Contrôle de propriété incomplet sur `AssignmentService` (notation/suppression de devoirs)
  2. Reprise après incident non automatisée sur les campagnes email
  3. Rôle `SUPPORT` pleinement modélisé mais non attribuable depuis l'interface admin (MVP)

**Éléments visuels :** cartes de chiffres clés + 3 cartes de limite (couleur alerte discrète, pas rouge vif).

**À expliquer à l'oral :** assumer sereinement les limites — *« Je préfère les nommer moi-même, avec la piste de correction, plutôt que d'attendre qu'elles soient découvertes. »*

**Questions potentielles du jury :**
- *Pourquoi ces limites n'ont-elles pas été corrigées avant la soutenance ?* → Priorisation assumée : le temps de stage restant a été consacré à fiabiliser le cœur fonctionnel (progression, certification, sécurité transversale) plutôt qu'à ces trois points précis, chacun documenté avec sa piste de correction concrète.

---

### Slide 22 — Perspectives

**Objectif :** montrer une vision réaliste de l'évolution, ancrée dans les limites réelles (pas des fonctionnalités arbitraires).

**Contenu à afficher :**
- Fermer les 3 limites du bilan (contrôle de propriété, reprise auto, rôle Support)
- Intégration continue (CI/CD) — actuellement absente
- Activation complète de la topologie de déploiement cible (nginx, déjà anticipée dans la configuration)
- Extension de la génération IA à d'autres formats pédagogiques
- Recherche sémantique pour l'assistant de cours si le catalogue grossit

**Éléments visuels :** liste courte, pas de roadmap trimestrielle fictive.

**À expliquer à l'oral :** relier chaque perspective à une limite ou un choix déjà assumé plus tôt dans la présentation — cohérence de bout en bout.

**Questions potentielles du jury :**
- *Quelle serait la prochaine priorité si le stage continuait ?* → Le CI/CD en premier : c'est ce qui manque le plus pour industrialiser tout le reste (tests déjà présents, il ne manque que leur exécution automatique à chaque changement).

---

### Slide 23 — Conclusion et remerciements

**Objectif :** boucler la boucle Problématique → Solution → Réalisation → Résultat, puis clore.

**Contenu à afficher :**
- *« IAT Academy dispose désormais d'une plateforme e-learning sécurisée qui va bien au-delà du CRUD : IA générative résiliente, contrôle d'accès à granularité fine, et respect strict des validations humaines obligatoires. »*
- Merci pour votre attention — questions ?

**Éléments visuels :** carte « boarding pass » façon certificat de réussite, sobre.

**À expliquer à l'oral :** terminer par la phrase de conclusion, marquer une pause, inviter les questions.

**Questions potentielles du jury :** transition vers la session de questions générales (voir `docs/11-questions-jury.md`).

---

## Scénario global de présentation

Enchaîner les slides sans jamais revenir en arrière : chaque partie répond à une question posée par la précédente — le **contexte** justifie la **problématique**, qui justifie les **objectifs**, qui se traduisent en **besoins**, qui se formalisent en **conception UML**, qui se concrétise en **architecture** puis en **fonctionnalités**, démontrées en direct, puis évaluées honnêtement dans le **bilan**. Ne jamais présenter une fonctionnalité (slides 16-19) avant d'avoir montré le modèle qui la sous-tend (slides 10-13) — le jury doit pouvoir relier chaque fonctionnalité vue en démo à un diagramme déjà montré.

Transition orale recommandée entre les grandes parties : *« Nous avons vu pourquoi → voyons maintenant comment c'est conçu → puis ce qui a été réellement construit. »*

---

## Fonctionnalités à privilégier pendant la démonstration

Classement repris de `docs/10-fonctionnalites-valeur-ajoutee.md`, déjà vérifié contre le code :

**🔥 À absolument montrer**
1. Correction hybride en direct (cascade réelle observable)
2. Progression en cascade + badge Année 1 validée
3. Certificat vérifiable + LinkedIn
4. Génération de questions par IA avec repli

**⭐ Si le temps le permet**
5. Badge partagé (carte d'embarquement Java2D)
6. Bourse à l'emploi réservée aux diplômés
7. Workflow de signature externe du tuteur

**💡 À mentionner sans démonstration longue**
- Limitation de débit Redis, 2FA, migrations Flyway, suite de 151 tests, conteneurisation Docker

---

## Questions techniques probables du jury (par domaine)

Banque complète et détaillée disponible dans `docs/11-questions-jury.md` (72 questions). Synthèse courte, soutenable oralement, par domaine :

**Architecture**
- *Pourquoi une architecture en couches plutôt que microservices ?* → Un seul backend cohérent pour un domaine métier unique et fortement couplé (progression, certification, stage) — des microservices auraient ajouté de la complexité de coordination sans bénéfice réel à cette échelle.

**Backend**
- *Pourquoi des DTO plutôt que d'exposer directement les entités JPA ?* → Éviter de fuiter la structure interne de persistance côté API, et contrôler précisément ce qui est exposé par rôle.

**Frontend**
- *Pourquoi Next.js plutôt qu'un simple React SPA ?* → Le rendu serveur est indispensable pour au moins une page publique (certificat, Open Graph LinkedIn) — Next.js couvre ce besoin sans architecture hybride bricolée.

**Base de données**
- *Pourquoi PostgreSQL plutôt qu'une base NoSQL ?* → Le modèle est fortement relationnel (formations → modules → leçons, validations d'UF liées à des utilisateurs et directeurs) — des jointures et contraintes d'intégrité réelles, pas un besoin de schéma flexible.

**Sécurité**
- *Le RBAC suffit-il seul ?* → Non, volontairement complété par un contrôle de propriété par ressource en couche service — voir slide 18 et `docs/07-securite.md`.

**UML**
- *Vos diagrammes sont-ils garantis à jour ?* → Vérifiés un par un contre le code le 2026-09-12 ; un écart réel a été trouvé et corrigé (slide 13) — la méthode de vérification est documentée, pas seulement le résultat.

**API**
- *Combien d'endpoints et comment sont-ils organisés ?* → 179 points d'accès sur 31 contrôleurs, regroupés par domaine fonctionnel (voir Annexe E du rapport).

**Authentification**
- *Pourquoi un cookie plutôt qu'un `localStorage` pour le JWT ?* → Un cookie `httpOnly` est inaccessible au JavaScript, ce qui neutralise le vol de jeton par une faille XSS — un `localStorage` y serait exposé.

**Choix technologiques**
- *Quel a été le critère principal de choix de la stack ?* → Chaque brique répond à une contrainte identifiée (voir tableau slide 14), jamais un effet de mode.

**IA / chatbot**
- *Que se passe-t-il si les deux fournisseurs IA sont indisponibles le jour de la soutenance ?* → Message d'erreur explicite, jamais un plantage — assumé comme preuve de robustesse plutôt que caché (voir `docs/09-scenarios-demonstration.md` §4).

**Design / UX**
- *Le design a-t-il été testé auprès de vrais utilisateurs ?* → Non formellement — limite assumée, le design a été validé par itération avec l'équipe pédagogique plutôt que par des tests utilisateurs structurés.

**Déploiement**
- *L'application est-elle en production aujourd'hui ?* → Non — Docker Compose fait tourner Postgres/Redis en local ; la conteneurisation complète (API, frontend, nginx) est une topologie cible déjà anticipée dans la configuration, pas encore activée (limite assumée, voir slide 21).

**Limites du projet**
- *Quelle est la limite la plus importante à corriger en premier ?* → Le contrôle de propriété incomplet sur `AssignmentService` — c'est une vraie faille d'accès (IDOR), pas seulement un manque fonctionnel, donc prioritaire sur les deux autres.
