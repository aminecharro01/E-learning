# 11. Banque de questions du jury — IAT Academy

> Ce document rassemble des questions que le jury pourrait poser en
> soutenance, avec une réponse recommandée « comme un étudiant répondrait
> réellement », un point technique à retenir absolument, et — quand c'est
> pertinent — une question piège de relance. Il complète les sections
> « Questions possibles du jury » déjà présentes dans `01-` à `08-` : il ne
> les recopie pas, il aborde d'autres angles (mise en situation, choix
> alternatifs, limites assumées, relances techniques). Toutes les
> affirmations factuelles ci-dessous sont vérifiées dans le code ou dans
> les fichiers `01-` à `08-` déjà rédigés — aucune n'est inventée pour les
> besoins de la réponse.

---

## A. Compréhension générale du projet

**Question du jury** : En une minute, expliquez-moi ce que fait IAT Academy et pourquoi ce projet existe.

**Réponse recommandée** : IAT Academy est une académie marocaine de formation aux métiers de l'aviation et du tourisme, sur un cursus de deux ans mêlant présentiel et stage en entreprise. Avant la plateforme, il n'existait aucun espace numérique unifiant contenu pédagogique, évaluations et suivi de progression — trois apprenants pouvaient avoir trois façons différentes d'être suivis. J'ai construit une plateforme web (backend Spring Boot, frontend Next.js) qui structure le cursus en Formation → Module → Leçon → Bloc, impose un déblocage séquentiel vérifié côté serveur, centralise l'évaluation (quiz et devoirs), et automatise la délivrance de certificats vérifiables publiquement.

**Point technique à retenir** : le problème métier central n'est pas « afficher du contenu », c'est garantir côté serveur qu'un apprenant ne peut pas contourner l'ordre du cursus — c'est ce qui justifie toute la complexité de `ProgressionService`.

**Question piège / relance possible** : Qui a défini ces besoins — un client réel ou vous-même ? — Il s'agit d'un vrai centre de formation (IAT Academy) avec des besoins réels de suivi pédagogique ; le cursus (UF, stage, soutenance) reflète leur fonctionnement réel, pas un cas d'école inventé pour la démonstration.

---

**Question du jury** : Quels sont les acteurs du système et pourquoi avoir un rôle SUPPORT qui n'est pas « staff » ?

**Réponse recommandée** : Cinq rôles internes (`SUPER_ADMIN`, `ADMIN`, `FORMATEUR`, `ETUDIANT`, `SUPPORT`) plus des acteurs externes sans compte (tuteur de stage, visiteur public). `SUPPORT` est un choix de modélisation délibéré : c'est un compte interne (accès à des statistiques en lecture, gestion des messages de contact et de la newsletter, joignable en messagerie) mais explicitement exclu de `Role.isStaff()`, qui ne renvoie vrai que pour `SUPER_ADMIN`/`ADMIN`/`FORMATEUR`. Concrètement, un utilisateur SUPPORT ne peut ni créer de contenu pédagogique, ni corriger un quiz, ni valider une UF.

**Point technique à retenir** : `isStaff()` est une méthode métier utilisée dans tout le backend pour du contrôle d'accès fin (au-delà de `@PreAuthorize`) — SUPPORT en est explicitement exclu, ce n'est pas un oubli.

**Question piège / relance possible** : Un utilisateur SUPPORT peut-il aujourd'hui être créé via l'interface admin ? — Non : `AdminService.changeRole()` refuse toute promotion vers `SUPPORT` en MVP (limite documentée dans `ch4_realisation.tex`) ; seul le compte de démonstration porte ce rôle, créé directement en base par le seed de données.

---

**Question du jury** : Quelles sont les fonctionnalités qui, selon vous, dépassent le simple CRUD attendu d'une plateforme e-learning ?

**Réponse recommandée** : Quatre exemples concrets et vérifiables dans le code : (1) la génération de questions de quiz par IA avec repli automatique Gemini → Grok et parsing tolérant de la réponse du modèle ; (2) la génération d'image de badge « carte d'embarquement » en Java2D, mise en cache sur disque ; (3) la vérification publique de certificat, qui sépare délibérément la preuve vérifiable (métadonnées) du document original (PDF réservé à l'école) ; (4) le contrôle d'accès à granularité fine (propriété de ressource), qui va au-delà d'un simple `@PreAuthorize` par rôle.

**Point technique à retenir** : dans les quatre cas, la complexité ajoutée sert un besoin métier réel identifié — ce n'est jamais de la sophistication gratuite.

**Question piège / relance possible** : Est-ce que ces fonctionnalités étaient demandées initialement, ou est-ce vous qui les avez proposées ? — Le déblocage séquentiel et la certification vérifiable répondaient à un besoin explicite de l'école ; la génération de questions par IA et l'assistant de cours ont été proposés comme valeur ajoutée technique, une fois le cœur fonctionnel stabilisé.

---

**Question du jury** : Comment le parcours d'un apprenant se déroule-t-il de bout en bout, techniquement ?

**Réponse recommandée** : Connexion (JWT posé en cookie httpOnly) → tableau de bord → ouverture d'un module → consultation des blocs de contenu (vidéo/texte/PDF/image) → prise de notes personnelles éventuelle → passage du quiz de fin de module. Le score déclenche en cascade une vérification de progression (`ProgressionService`), qui peut débloquer le module suivant, attribuer un badge, ou — si tous les modules de la formation sont complétés — déclencher l'émission automatique d'un certificat (`CertificateService.tryIssueIfEligible`). Pour le stage, un flux séparé implique le dépôt du dossier, la validation manuelle du directeur et la signature électronique d'un tuteur externe sans compte.

**Point technique à retenir** : le score d'un quiz n'est jamais une fin en soi côté backend — il déclenche systématiquement une cascade de vérifications (progression, badge, certificat) centralisée dans `applyPassEffects`.

**Question piège / relance possible** : Que se passe-t-il si un apprenant repasse un quiz déjà réussi ? — Le paramètre `maxAttempts` du quiz limite le nombre de tentatives, et `retryDelayMinutes` impose un délai entre deux tentatives ; au-delà, une nouvelle tentative est simplement refusée par le service.

---

**Question du jury** : Le projet a-t-il été construit seul ou en équipe ? Quelle est la taille du code ?

**Réponse recommandée** : Projet individuel de fin d'études. Le backend compte 31 contrôleurs, 46 services, 38 repositories, 39 entités JPA et 45 migrations Flyway ; le frontend est organisé en deux shells (apprenant et staff) avec des composants regroupés par domaine plutôt que par type technique. Ce n'est pas un projet trivial en volume, mais la taille seule n'est pas l'indicateur le plus pertinent — la vraie complexité est dans les règles métier (progression séquentielle, correction hybride, gate directeur).

**Point technique à retenir** : la métrique qui compte pour le jury n'est pas le nombre de lignes, c'est la cohérence de l'architecture en couches maintenue sur 31 contrôleurs sans logique métier qui fuit dans un seul d'entre eux.

**Question piège / relance possible** : Combien de temps a pris le développement ? — Le rythme des migrations Flyway (V1 à V45, avec des fonctionnalités ajoutées puis parfois retirées comme la banque de questions en V24→V36) montre une évolution incrémentale sur la durée du stage, pas un développement en un seul bloc.

---

**Question du jury** : Quel est le rôle du Directeur pédagogique (`ADMIN`) que la plateforme ne peut pas automatiser, et pourquoi ?

**Réponse recommandée** : Deux UF sont soumises à un gate de validation humaine (`UfValidationService.DIRECTOR_GATED_UFS = Set.of("UF 5", "UF 11")`, correspondant au Stage et à la Soutenance) : un critère automatique (quiz réussi, contenu vu) ne suffit pas à juger qu'un stage en entreprise s'est bien passé ou qu'une soutenance orale était satisfaisante — ce jugement reste humain par nature, la plateforme ne fait qu'outiller sa traçabilité (notification, badge, horodatage, traçabilité de qui a validé).

**Point technique à retenir** : pour toute autre UF que ces deux-là, `isValidated(...)` renvoie systématiquement `true` — la validation humaine n'est donc pas un mécanisme générique appliqué partout, c'est une exception ciblée sur deux UF précises.

**Question piège / relance possible** : Le code des UF gatées (« UF 5 », « UF 11 ») est-il une chaîne de caractères en dur — est-ce fragile ? — Oui, c'est un `String` libre comparé littéralement, sans contrainte de clé étrangère : renommer cette UF dans les données casserait silencieusement le gate. C'est une limite assumée du choix « UF = attribut plutôt que table dédiée » (voir section D).

---

**Question du jury** : Si vous deviez pitcher ce projet à un investisseur ou un directeur d'école en 30 secondes, que diriez-vous ?

**Réponse recommandée** : Une plateforme qui remplace le suivi manuel d'un cursus aviation/tourisme par un système où l'accès au contenu, l'évaluation et la certification sont contrôlés et tracés automatiquement côté serveur, tout en gardant la main humaine là où elle est irremplaçable (validation de stage, soutenance) — avec un certificat numériquement vérifiable par un employeur en un clic, sans dépendre de la bonne foi d'un CV.

**Point technique à retenir** : l'argument différenciant n'est pas « une plateforme de plus », c'est la vérifiabilité publique de la certification, qui n'existait pas du tout avant (processus papier).

**Question piège / relance possible** : Combien d'écoles ou d'apprenants réels utilisent la plateforme aujourd'hui ? — À ce stade MVP académique, la plateforme n'est pas encore déployée en production réelle (voir section G, absence de topologie d'hébergement finalisée) ; c'est un livrable de fin d'études validé fonctionnellement, pas encore un produit en exploitation.

---

## B. Architecture

**Question du jury** : Décrivez l'architecture globale en une phrase, puis détaillez.

**Réponse recommandée** : Trois niveaux — un frontend Next.js qui parle HTTP/JSON à un backend Spring Boot en couches Contrôleur → Service → Repository → Entité, lequel persiste dans PostgreSQL et s'appuie sur Redis pour tout ce qui est éphémère (rate limiting, verrous). Le frontend sert deux espaces distincts (`app/**` apprenant, `(admin)/admin/**` staff) via deux `layout.tsx` qui portent chacun leur propre garde d'accès et leur chrome visuel.

**Point technique à retenir** : le backend est entièrement `STATELESS` — aucune session serveur, toute l'identité est reconstruite à chaque requête à partir du seul JWT.

**Question piège / relance possible** : Pourquoi ne pas avoir choisi une architecture microservices ? — Le domaine (une seule académie, un seul cursus) ne justifie pas la complexité opérationnelle de services distincts (déploiement, observabilité, cohérence transactionnelle distribuée) pour un volume qui reste celui d'une application monolithique modeste ; un monolithe bien découpé en couches donne déjà l'essentiel des bénéfices (séparation des responsabilités) sans le coût.

---

**Question du jury** : Pourquoi une architecture en couches strictes (Controller → Service → Repository) plutôt que de laisser les contrôleurs accéder directement aux repositories pour les cas simples ?

**Réponse recommandée** : Parce qu'un endpoint « simple » aujourd'hui accumule des règles avec le temps — notification, badge, contrôle de propriété — et les garder dans le service dès le départ évite un refactor de dernière minute. C'est surtout le seul endroit où peut vivre le contrôle d'accès fin qu'un `@PreAuthorize` seul ne peut pas exprimer (« cette conversation appartient-elle à cet utilisateur précis ? »).

**Point technique à retenir** : la règle du projet est qu'un contrôleur ne fait qu'un seul appel de service — `StageController#validateUf` est l'exception documentée (deux appels), justifiée explicitement plutôt que cachée.

**Question piège / relance possible** : Montrez-moi un contrôleur qui viole cette règle. — `StageController#validateUf` enchaîne `ufValidationService.validate(...)` puis `progressionService.checkAndAwardYearBadges(...)` ; c'est assumé car ce sont deux domaines distincts (validation d'UF vs badges d'année) qui ne devaient pas être fusionnés dans un seul service pour ce seul appelant.

---

**Question du jury** : Le diagramme de séquence « progression UF → certificat » — est-il exact sur le point d'application du contrôle du Directeur ?

**Réponse recommandée** : Il l'est maintenant, mais il ne l'était pas dans une version antérieure, et c'est une histoire que j'assume complètement — elle illustre justement la démarche de vérification systématique menée sur ce projet. En relisant le diagramme contre le code, j'ai trouvé qu'il faisait interroger `UfValidationService.isValidated(...)` directement au moment de l'émission du certificat (`tryIssueIfEligible`), alors que ce chemin appelle en réalité `isModuleCompleted` → `isModuleContentCompleted`, qui ne vérifie que le contenu et le quiz de fin de module — jamais `UfValidationService`. Le gate du Directeur (UF 5, UF 11) est réellement appliqué plus tôt, au déverrouillage séquentiel des modules (`isModuleAccessible` → `isUfFullyDone`). J'ai corrigé le `.puml` pour scinder les deux flux en deux fragments distincts (déverrouillage, puis émission), avec une note explicite sur le fait que le gate a déjà été appliqué en amont.

**Point technique à retenir** : le résultat observé par l'utilisateur n'a jamais changé — un apprenant ne peut de toute façon pas compléter les modules qui suivent une UF gatée tant qu'elle n'est pas validée. Seule la représentation du diagramme était imprécise sur le point d'application technique ; le code, lui, était correct depuis le début.

**Question piège / relance possible** : Comment avez-vous détecté cet écart, et qu'est-ce qui vous garantit qu'il n'y en a pas d'autres ? — Par une relecture systématique de chaque diagramme contre le code source correspondant, documentée dans `02-architecture-et-diagrammes.md` §6 : cinq points au total ont été passés en revue, deux corrigés (celui-ci et l'acteur SUPPORT absent du diagramme de cas d'utilisation), les autres jugés être des simplifications assumées plutôt que des erreurs. Je ne peux pas garantir une exhaustivité absolue, mais la méthode — confronter chaque message du diagramme à la méthode Java réellement appelée — est reproductible et documentée.

---

**Question du jury** : Concrètement, où se trouve le code qui vérifie que le gate directeur est respecté si ce n'est pas dans `tryIssueIfEligible` ?

**Réponse recommandée** : Dans `ProgressionService.isModuleAccessible`, via `isUfFullyDone`, appelée en cascade par `isYear1FullyDone`/`isYear2FullyDone`. Cette méthode combine trois conditions : contenu terminé, quiz de fin d'UF réussi s'il existe, et validation humaine si l'UF fait partie de `DIRECTOR_GATED_UFS`. Un apprenant ne peut donc physiquement pas « avancer » au-delà d'une UF non validée par le directeur — le blocage a lieu en amont, pas au moment du certificat.

**Point technique à retenir** : `isModuleCompleted` est un simple alias public de `isModuleContentCompleted` — les deux noms coexistent dans le code, ce qui peut prêter à confusion en lecture rapide, y compris pour l'auteur du diagramme au moment où il l'a dessiné.

**Question piège / relance possible** : Si je supprime manuellement une validation d'UF en base après que l'apprenant a déjà avancé, le certificat serait-il quand même délivré à tort ? — Oui en théorie : puisque `tryIssueIfEligible` ne revérifie pas `UfValidationService` au moment de l'émission, une incohérence de données introduite après coup (hors flux normal de l'application) ne serait pas rattrapée à cette étape précise — c'est une caractéristique réelle du code (pas un artefact du diagramme, désormais corrigé), qu'un futur correctif pourrait fermer en ajoutant une vérification défensive à l'émission elle-même.

---

**Question du jury** : Quels diagrammes UML avez-vous produits et pourquoi ces onze-là précisément ?

**Réponse recommandée** : Un diagramme de cas d'utilisation (vue métier d'ensemble), quatre diagrammes de classes (vue d'ensemble, pédagogie, évaluation, stage/certification — du général au spécifique), quatre diagrammes de séquence (génération IA, correction hybride, progression/certificat, contrôle d'accès propriétaire — les flux jugés les plus significatifs), et deux diagrammes d'infrastructure générés par script Python (architecture en couches, déploiement). Le choix a privilégié la couverture des flux métier les plus complexes plutôt que l'exhaustivité de chaque endpoint.

**Point technique à retenir** : les deux diagrammes mingrammer sont générés par script (bibliothèque `diagrams`), donc régénérables automatiquement après une évolution du code — contrairement aux `.puml`, qui nécessitent une relecture manuelle à chaque changement.

**Question piège / relance possible** : Pourquoi ne pas avoir de diagramme d'activité ou de composants ? — Choix assumé de couverture : les diagrammes de séquence couvrent déjà le comportement dynamique des flux critiques, et le diagramme d'architecture en couches couvre la vue composants à un niveau suffisant pour ce périmètre — ajouter un diagramme d'activité aurait surtout dupliqué l'information déjà portée par les séquences.

---

**Question du jury** : Le diagramme de cas d'utilisation modélise une hiérarchie `Étudiant --|> User`, `Admin --|> Formateur`. Est-ce que ça correspond à une hiérarchie de classes Java ?

**Réponse recommandée** : Non, et c'est important de le clarifier : `Role` est un `enum` Java plat à cinq valeurs (`SUPER_ADMIN, ADMIN, FORMATEUR, ETUDIANT, SUPPORT`) — un enum ne peut techniquement pas hériter d'un autre enum en Java. La hiérarchie du diagramme est une convention de modélisation UML qui représente fidèlement l'inclusion des permissions (un Formateur peut tout ce qu'un Étudiant peut), mais ce n'est pas un arbre de classes réel. La logique de permission réelle est portée par une seule méthode, `Role.isStaff()`.

**Point technique à retenir** : ne jamais dire en soutenance qu'il existe des classes `Etudiant extends User` en Java — ça n'existe pas, et le jury peut vérifier immédiatement dans `Role.java`.

**Question piège / relance possible** : Le rôle SUPPORT apparaît-il dans ce diagramme de cas d'utilisation ? — Non, c'est un écart documenté explicitement en section 6 de `02-architecture-et-diagrammes.md` : le rôle existe et est actif dans le code, mais aucun acteur ni cas d'utilisation dédié ne le représente dans ce diagramme précis.

---

**Question du jury** : Pourquoi utiliser à la fois PlantUML et un script Python (mingrammer) pour les diagrammes plutôt qu'un seul outil ?

**Réponse recommandée** : Les deux outils ne servent pas le même usage. PlantUML est adapté à la notation UML formelle (classes, séquences, cas d'utilisation) attendue dans un rapport d'ingénieur. La bibliothèque Python `diagrams` (mingrammer) est plus adaptée à une vue « boîtes et flèches » orientée infrastructure (icônes de services, clusters), plus lisible pour discuter du déploiement, et surtout régénérable par script après une évolution de l'architecture.

**Point technique à retenir** : le diagramme de déploiement mingrammer porte lui-même la mention « architecture cible » dans son titre — il documente honnêtement qu'il ne décrit pas l'existant, mais la trajectoire prévue.

**Question piège / relance possible** : Un diagramme généré par script n'est-il pas moins rigoureux qu'un diagramme dessiné à la main ? — Au contraire : un script versionné dans le dépôt peut être rejoué à l'identique et modifié par une diff Git lisible, alors qu'un diagramme dessiné à la main dans un outil graphique dérive plus facilement du code sans que personne ne s'en aperçoive.

---

**Question du jury** : Quelles sont les autres simplifications assumées dans vos diagrammes de séquence ?

**Réponse recommandée** : Deux diagrammes (correction hybride, contrôle d'accès) font dialoguer directement le contrôleur avec le service métier final (`QuizAttemptService`, `MessagingService`), en omettant la couche de façade fine intermédiaire (`QuizService`) quand elle existe réellement dans le code. C'est un choix pédagogique volontaire : ce hop de délégation est purement mécanique (le contrôleur délègue à un seul service qui lui-même délègue), l'omettre ne change rien à la compréhension du flux mais évite d'alourdir le diagramme d'une boîte qui n'ajoute aucune logique propre.

**Point technique à retenir** : toutes ces simplifications sont listées explicitement dans la section « Écarts identifiés » de `02-architecture-et-diagrammes.md` — le jury n'a pas besoin de les découvrir seul, elles sont assumées par écrit.

**Question piège / relance possible** : Comment le jury peut-il vérifier qu'il n'y a pas d'autres écarts non documentés ? — En confrontant directement un diagramme au fichier source cité ; la démarche suivie dans ce projet a été de vérifier chaque diagramme ligne par ligne contre le code réel plutôt que de faire confiance à la mémoire de la conception initiale, précisément pour éviter cette question.

---

## C. Frontend

**Question du jury** : Comment avez-vous décidé de séparer le code en deux shells (apprenant/staff) plutôt qu'une arborescence unique avec des rôles ?

**Réponse recommandée** : Le chrome visuel (sidebar, header), les polices, et les gardes d'accès diffèrent suffisamment entre l'espace staff et l'espace apprenant pour justifier deux racines distinctes (`app/**` et `(admin)/admin/**`), chacune avec son propre `layout.tsx`. Cette séparation matérialise directement dans les dossiers la frontière de permissions du système — une nouvelle page déposée sous l'un des deux arbres hérite automatiquement de l'auth-guarding et du chrome sans câblage supplémentaire.

**Point technique à retenir** : le pattern d'extraction de composants (`MessagingConsole`, `AccountSettingsPanel`) évite que cette séparation en deux shells ne duplique la logique métier partagée entre eux.

**Question piège / relance possible** : Que se passe-t-il si un composant partagé a besoin d'un comportement légèrement différent selon le shell ? — Le composant détecte lui-même le rôle de l'utilisateur connecté via `useAuth()` plutôt que de recevoir une prop — `MessagingConsole` calcule `isStaff` en interne pour adapter les contacts proposés, ce qui évite d'exposer cette logique au composant page qui l'englobe.

---

**Question du jury** : Le frontend fait-il du rendu serveur (SSR) ou uniquement du client-side rendering ?

**Réponse recommandée** : La majorité des pages observées sont `"use client"` et chargent leurs données via `useEffect` après montage — c'est du CSR classique, avec `Loader`/`Skeleton` pour l'attente, pas du SSR data-fetching pour ces pages. Next.js 15 et l'App Router sont donc utilisés ici surtout pour le routing par fichiers et les layouts imbriqués (auth-guarding gratuit), pas pour tirer parti du SSR au sens strict.

**Point technique à retenir** : ce choix a un coût (pas de contenu pré-rendu, un flash de chargement à chaque navigation protégée) mais cohérent avec une application majoritairement authentifiée où le SEO n'est pas un enjeu (contrairement aux pages publiques comme la landing page ou `/verify/[code]`).

**Question piège / relance possible** : Le SSR n'aurait-il pas amélioré les performances perçues ? — Probablement pour les pages publiques, mais la majorité du contenu applicatif est de toute façon protégé par authentification et personnalisé par utilisateur — le bénéfice du SSR (contenu pré-rendu partagé) est plus limité que sur un site de contenu public.

---

**Question du jury** : Pourquoi ne pas avoir utilisé React Query ou SWR pour la gestion des données serveur ?

**Réponse recommandée** : Ce n'est pas dans `package.json` — l'état applicatif (modules, conversations, etc.) est local par page, rechargé via `useEffect` à chaque montage, sans cache global. C'est un choix pragmatique plutôt qu'un oubli : le volume de re-fetching observé reste raisonnable pour la taille du projet, et l'ajout d'une librairie de cache aurait introduit une complexité (invalidation, staleness) sans bénéfice mesuré à ce stade.

**Point technique à retenir** : c'est explicitement identifié comme piste d'évolution si l'état local par page re-fetche trop souvent à l'usage réel.

**Question piège / relance possible** : Comment gérez-vous la synchronisation entre plusieurs onglets ou composants qui affichent la même donnée ? — Aujourd'hui, pas de synchronisation automatique : chaque composant recharge sa propre copie via son propre `useEffect`. C'est une limite reconnue, qu'une librairie de cache partagé (React Query) résoudrait naturellement.

---

**Question du jury** : Le JWT n'est jamais lisible en JavaScript — comment le frontend sait-il alors si l'utilisateur est connecté au chargement de la page ?

**Réponse recommandée** : `AuthProvider` appelle systématiquement `GET /api/auth/me` au montage de l'application ; si la requête réussit (le cookie httpOnly est transmis automatiquement par le navigateur via `withCredentials: true`), l'utilisateur est reconstitué en état React. Un 401 à cet appel est volontairement ignoré comme une erreur applicative (`err.status !== 401`) — un visiteur non connecté sur la landing page n'est pas un cas d'erreur.

**Point technique à retenir** : le frontend ne « sait » jamais rien du token lui-même — il ne fait que déduire l'état de connexion du succès ou de l'échec d'un appel réseau protégé.

**Question piège / relance possible** : Cela ne crée-t-il pas un flash de contenu non authentifié avant que `/api/auth/me` ne réponde ? — C'est exactement pour éviter ce flash que le layout admin affiche un `PageLoader` tant que `loading` est vrai, plutôt que de rendre le contenu protégé de façon optimiste puis de le retirer en cas d'échec.

---

**Question du jury** : Comment le formatage/la validation des rôles est-il partagé entre le layout admin et les pages internes ?

**Réponse recommandée** : `useAuth()` expose des booléens dérivés (`isAdmin`, `isSuperAdmin`, `isFormateur`, `isSupport`) et une fonction variadique `hasRole(...roles)`, calculés une seule fois dans le `useMemo` du provider. Le layout admin les utilise pour la garde d'accès (`hasRole("SUPER_ADMIN","ADMIN","FORMATEUR","SUPPORT")`), et des pages internes comme `AdminDashboardPage` les réutilisent pour choisir quel tableau de bord afficher (`SupportDashboard`, `FormateurDashboard`, `DirecteurDashboard`) — deux usages différents du même hook, jamais dupliqués.

**Point technique à retenir** : ce choix conditionne l'affichage, jamais la sécurité — la vraie barrière reste `@PreAuthorize` côté Spring Boot, le frontend ne fait que de l'UX.

**Question piège / relance possible** : Si un attaquant modifie le state React pour se faire passer pour un admin, peut-il accéder aux données admin ? — Non : il pourrait au mieux voir s'afficher un composant d'interface admin vide, mais tout appel réseau réel vers un endpoint réservé échouerait en 403 côté backend, qui revérifie systématiquement le rôle indépendamment de ce que raconte le frontend.

---

**Question du jury** : Le CSP autorise `'unsafe-inline'` sur `script-src` — n'est-ce pas une faille de sécurité ?

**Réponse recommandée** : C'est une concession délibérée et documentée en commentaire dans `next.config.ts` : elle est nécessaire pour le petit script inline d'initialisation du thème dans `app/layout.tsx`, qui doit s'exécuter avant l'hydratation React (pour éviter un flash de mauvais thème). Ce script est une constante statique du code source, jamais de l'input utilisateur — le vrai rempart contre l'injection de HTML (le contenu de leçon rédigé par les formateurs) est DOMPurify, pas le CSP, qui n'est qu'une défense en profondeur secondaire ici.

**Point technique à retenir** : ne jamais présenter le CSP comme la protection principale contre le XSS dans ce projet — c'est DOMPurify qui joue ce rôle pour le contenu réellement à risque.

**Question piège / relance possible** : Pourquoi ne pas générer un nonce dynamique pour ce script plutôt que d'autoriser `unsafe-inline` globalement ? — C'est une amélioration légitime et réalisable (Next.js supporte les nonces CSP) qui réduirait la portée de la concession à ce seul script plutôt qu'à tout `script-src` — non implémentée ici, mais identifiable comme piste d'amélioration facile.

---

**Question du jury** : Comment le polling de `useUnreadMessagesCount` toutes les 20 secondes ne surcharge-t-il pas le backend à grande échelle ?

**Réponse recommandée** : À l'échelle actuelle (un nombre d'utilisateurs modeste, MVP académique), ce n'est pas un problème réel — chaque utilisateur connecté génère un appel léger toutes les 20 secondes. Mais je reconnais que ça ne passerait pas à l'échelle d'une plateforme avec des milliers d'utilisateurs simultanés sans backend temps réel : la vraie solution serait un canal push (WebSocket/SSE), qui n'existe pas aujourd'hui côté Spring Boot.

**Point technique à retenir** : le polling est un choix pragmatique explicitement documenté comme « le moins coûteux pour un badge de notification », pas une solution définitive à grande échelle.

**Question piège / relance possible** : Combien d'utilisateurs simultanés le système pourrait-il supporter avant que ce polling ne devienne un problème ? — Aucune mesure de charge n'a été faite spécifiquement sur ce point ; c'est une limite honnête à assumer plutôt qu'un chiffre inventé — le seul test de charge documenté dans le projet concerne la concurrence sur `start()` de quiz (`loadtest/quiz-start-concurrency.js`), pas la messagerie.

---

**Question du jury** : Le Strict Mode de React double-invoque les effets en développement — quel bug concret cela aurait-il pu créer sans les gardes `cancelled` ?

**Réponse recommandée** : Sans le `let cancelled = false` vérifié après chaque `await`, un composant démonté avant la fin d'un appel réseau (par exemple une navigation rapide qui quitte `ProfileCompletionGuard` avant que `getMe()` ne réponde) pourrait déclencher un `router.replace` sur une page qui n'est plus affichée, ou un `setState` sur un composant démonté (avertissement React, voire un état incohérent si un autre composant a entre-temps repris ce state). C'est un piège classique du Strict Mode, systématiquement traité dans ce projet à chaque effet asynchrone.

**Point technique à retenir** : cette garde est une règle du projet appliquée systématiquement (`useUnreadMessagesCount`, `ProfileCompletionGuard`), pas un correctif isolé sur un seul composant qui aurait posé problème.

**Question piège / relance possible** : Cette garde protège-t-elle aussi contre une race condition entre deux appels réseau successifs (une réponse tardive qui écrase une réponse plus récente) ? — Partiellement : elle empêche un composant démonté d'agir, mais ne réordonne pas deux réponses qui arriveraient dans le désordre pour un composant toujours monté — un identifiant de requête ou une librairie comme React Query serait nécessaire pour couvrir ce cas plus large, non traité ici.

---

## D. Backend

**Question du jury** : Pourquoi Spring Boot plutôt que Node.js/Express, sachant que le frontend est déjà en JavaScript/TypeScript ?

**Réponse recommandée** : Un domaine avec autant de règles métier transversales (progression séquentielle, gate directeur, correction hybride, rôles hiérarchiques) bénéficie du typage fort de Java, de l'écosystème mature de Spring Security pour le RBAC déclaratif, et de Spring Data JPA pour un modèle relationnel avec 39 entités et de nombreuses contraintes d'intégrité. Rester en JavaScript partout aurait simplifié le contexte de switch mental, mais Node.js n'apporte pas d'avantage clair sur ce type de domaine métier dense — c'est un compromis assumé plutôt qu'un choix par défaut.

**Point technique à retenir** : le choix technique a été fait pour le domaine (règles métier denses, données relationnelles), pas pour uniformiser le langage entre les deux bouts de la stack.

**Question piège / relance possible** : N'auriez-vous pas été plus rapide en développement avec un seul langage ? — Sans doute pour le setup initial, mais l'essentiel du temps de développement a été consacré aux règles métier elles-mêmes (`ProgressionService`, 369 lignes) plutôt qu'à la friction entre langages, qui reste minime avec des DTO JSON bien définis des deux côtés.

---

**Question du jury** : Comment est structurée la génération de questions par IA — que se passe-t-il si Gemini ET Grok sont indisponibles en même temps ?

**Réponse recommandée** : `QuestionGenerationService.generate` teste d'abord si au moins un fournisseur est « configuré » (clé API non vide) — si aucun ne l'est, une `ApiException` explicite est levée immédiatement, sans aucun appel réseau. Si Gemini est configuré, il est tenté en premier ; toute exception (réseau, HTTP non-2xx, JSON invalide) est capturée et journalée, puis Grok est tenté s'il est configuré. Si les deux échouent, une `ApiException` finale explicite remonte au frontend, qui l'affiche comme un message d'erreur — aucune autre fonctionnalité de la plateforme n'est affectée par cette panne, l'IA est un module isolé.

**Point technique à retenir** : le service ne persiste jamais rien lui-même — il renvoie une liste de `CreateQuestionRequest` que `QuizService` valide et sauvegarde via le même chemin qu'une saisie manuelle, garantissant les mêmes invariants.

**Question piège / relance possible** : Le repli Gemini → Grok change-t-il la qualité des questions générées de façon perceptible pour l'utilisateur ? — Le prompt envoyé est identique aux deux fournisseurs et le format de réponse attendu (JSON de questions) aussi, mais la qualité réelle du contenu généré peut varier d'un modèle à l'autre — ce n'est pas mesuré/comparé formellement dans le projet, c'est une limite honnête à reconnaître si la question est posée frontalement.

---

**Question du jury** : Expliquez le mécanisme de verrouillage `pg_advisory_xact_lock` sur le démarrage d'une tentative de quiz — pourquoi en a-t-on besoin ?

**Réponse recommandée** : Sans ce verrou, N requêtes concurrentes de `start()` pour le même couple (utilisateur, quiz) — par exemple un double-clic ou un rafraîchissement rapide — passeraient chacune le test « pas de tentative en cours » avant qu'aucune n'ait encore inséré la sienne en base, créant chacune leur propre ligne en doublon. `acquireStartLock` pose un verrou consultatif PostgreSQL scopé à la transaction (`_xact_`), qui sérialise ces appels : la deuxième requête attend que la première ait commité (ou annulé) avant de tester à son tour l'existence d'une tentative. Ce scénario a été reproduit explicitement par un script de test de charge dédié (`loadtest/quiz-start-concurrency.js`).

**Point technique à retenir** : le verrou est automatiquement relâché à la fin de la transaction (commit ou rollback) — aucun code de libération explicite à écrire, contrairement à un verrou applicatif classique.

**Question piège / relance possible** : Pourquoi un verrou PostgreSQL plutôt qu'un verrou Redis (`SETNX`) puisque Redis est déjà utilisé pour le rate limiting ? — Le verrou doit être scopé exactement à la transaction JPA qui vérifie et crée la tentative — un verrou PostgreSQL natif se relâche automatiquement à la fin de cette même transaction, alors qu'un verrou Redis nécessiterait une gestion manuelle de libération et un couplage supplémentaire entre deux systèmes pour un besoin qui reste interne à la base de données.

---

**Question du jury** : Comment fonctionne la correction hybride d'un quiz (QCM + questions ouvertes) ?

**Réponse recommandée** : À la soumission, `QuizAttemptService.submit` calcule le score des questions à choix uniquement ; toute question `ESSAY` rencontrée lève un drapeau `pendingReview`, et le statut de la tentative devient `PENDING_REVIEW` plutôt que `PASSED`/`FAILED`. Un formateur corrige ensuite chaque question ouverte via `QuizGradingService.gradeEssay`, qui fait un upsert d'`EssayGrade` puis appelle `finalizeIfFullyGraded` — cette méthode ne recalcule le score final et ne change le statut que lorsque **toutes** les questions ouvertes de la tentative ont reçu une note, sinon elle retourne silencieusement sans rien modifier.

**Point technique à retenir** : la finalisation réutilise `applyPassEffects`, exactement la même méthode que la soumission automatique directe — badge, certificat et notification ne sont donc jamais dupliqués ni oubliés selon que la correction est automatique ou manuelle.

**Question piège / relance possible** : Un apprenant reçoit-il une notification de résultat pendant que sa tentative est `PENDING_REVIEW` ? — Non — le message affiché est « correction en attente », et les effets de bord (badge, certificat) n'ont lieu qu'à la finalisation complète, jamais sur un score partiel calculé avant correction manuelle.

---

**Question du jury** : Pourquoi ne pas utiliser MapStruct pour le mapping entité → DTO, plutôt que d'écrire des méthodes `toResponse` à la main partout ?

**Réponse recommandée** : C'est un choix assumé, pas un oubli — `pom.xml` ne contient aucune dépendance MapStruct. Le mapping manuel a un coût réel (du code répétitif entre services proches), mais un avantage direct : la logique de repli (« nom complet sinon email », vue dans `UfValidationResponse`) ou de formatage n'est jamais générique — elle est écrite explicitement là où elle a un sens métier, sans configuration d'annotation externe à apprendre pour un repreneur du projet ou pour le jury lui-même.

**Point technique à retenir** : sur un projet de cette taille (138 DTO), le coût du mapping manuel reste gérable ; MapStruct deviendrait plus rentable à mesure que le nombre de DTO proches augmenterait.

**Question piège / relance possible** : N'y a-t-il pas un risque d'incohérence entre deux méthodes `toResponse` similaires écrites à des moments différents ? — C'est un risque réel du mapping manuel, oui — aucun test automatisé ne vérifie la cohérence de format entre deux DTO de réponse proches ; c'est une limite honnête du choix, compensée seulement par la discipline de revue de code.

---

**Question du jury** : `open-in-view: false` — pourquoi ce choix, et quel problème concret cela a-t-il posé ?

**Réponse recommandée** : Ce réglage ferme la session Hibernate à la fin de la transaction `@Transactional`, avant que le contrôleur ne sérialise la réponse — cela force à décider explicitement, dans le service, quelles associations paresseuses doivent être chargées avant de sortir de la transaction, plutôt que de laisser Hibernate le faire implicitement et silencieusement pendant la sérialisation JSON (ce qui garderait une connexion base de données ouverte plus longtemps que nécessaire par requête HTTP). Le problème concret rencontré : `CertificateController` accédait à `cert.getFormation().getTitle()` après le retour du service, ce qui levait une `LazyInitializationException` la première fois qu'un certificat réel existait — jamais rencontré avant en démo faute de données réelles. Le correctif a été un `JOIN FETCH` explicite dans `CertificateRepository`.

**Point technique à retenir** : la solution retenue dans tout le projet est le `JOIN FETCH` explicite au cas par cas, jamais l'activation globale d'`open-in-view: true`, qui aurait masqué le problème au prix d'une connexion tenue plus longtemps.

**Question piège / relance possible** : Ce genre de bug est-il détecté par les tests automatisés ou seulement en conditions réelles ? — Ce cas précis a été détecté en conditions réelles (première fois qu'un certificat réel existait), pas par un test automatisé dédié — c'est une limite reconnue de la couverture de test actuelle, qui ne teste pas systématiquement l'accès post-transaction à chaque association lazy.

---

**Question du jury** : Comment gérez-vous les migrations de schéma en production sans jamais modifier une migration déjà déployée ?

**Réponse recommandée** : Chaque évolution de schéma passe par une nouvelle migration Flyway numérotée (`V<N>__description.sql`), jamais par l'édition d'un fichier existant — Flyway calcule un checksum de chaque fichier à l'application et le compare à celui enregistré dans `flyway_schema_history` à chaque démarrage suivant, ce qui fait échouer le démarrage en cas d'écart. Le cas le plus révélateur dans ce projet : une fonctionnalité entière (banque de questions, `V24`) a été abandonnée douze migrations plus tard, et le retour en arrière a été fait par une nouvelle migration (`V36`) qui défait proprement ce que `V24` avait fait — jamais par une réécriture de `V24`.

**Point technique à retenir** : la règle « jamais modifier une migration fusionnée » n'est pas qu'une convention d'équipe — elle est techniquement imposée par le mécanisme de checksum de Flyway, qui bloque le démarrage si elle est violée.

**Question piège / relance possible** : Que se passe-t-il si une migration échoue en plein milieu sur une base de production ? — Flyway marque la migration comme échouée dans `flyway_schema_history` et refuse toute nouvelle migration tant que l'état n'est pas résolu manuellement (réparation ou `flyway repair`) — ce cas n'a pas été rencontré en conditions réelles sur ce projet, faute d'environnement de production actif à ce jour (voir section G).

---

## E. Base de données

**Question du jury** : Pourquoi avoir modélisé l'UF (unité de formation) comme un simple attribut (`ufCode`) plutôt qu'une table dédiée ?

**Réponse recommandée** : Parce qu'une UF n'a, dans ce domaine métier, aucun attribut propre au-delà d'un code et d'un titre (`ufCode`/`ufTitle`) — elle n'existe que comme un regroupement logique de plusieurs `ModuleEntity` qui partagent le même code. Créer une table `uf` juste pour lui donner une clé primaire aurait ajouté une jointure systématique partout (modules, quiz, validations) sans qu'aucune donnée supplémentaire ne soit portée par cette ligne. C'est un compromis délibéré, documenté explicitement dans la migration `V33` au moment où `Quiz` a eu besoin à son tour de référencer une UF.

**Point technique à retenir** : ce choix a un coût réel — pas de contrainte de clé étrangère, l'intégrité référentielle repose sur une convention de nommage (`"UF 5"`, `"UF 11"`), ce qui rend le système fragile à une faute de frappe ou à un renommage non répercuté partout (par exemple dans `UfValidationService.DIRECTOR_GATED_UFS`, une simple chaîne de caractères comparée littéralement).

**Question piège / relance possible** : Referiez-vous ce choix aujourd'hui, avec le recul ? — Je le referais pour un MVP, mais je créerais une vraie table `uf` dès que le besoin de porter un attribut propre à l'UF apparaîtrait (prérequis inter-UF, description) — la section « Comment le modèle pourrait évoluer » de `05-base-de-donnees.md` documente justement ce chemin de migration progressive (nouvelle table, backfill depuis les `uf_code` existants, remplacement des colonnes scalaires par des FK).

---

**Question du jury** : Pourquoi PostgreSQL plutôt que MySQL ou une base NoSQL comme MongoDB ?

**Réponse recommandée** : Le domaine est fortement hiérarchique et relationnel (Formation → Module → Leçon → Bloc, apprenant → tentative → réponse) avec des contraintes transversales qui se prêtent naturellement à des clés étrangères et des contraintes `UNIQUE` en base (un seul certificat par apprenant/formation, une seule progression par apprenant/leçon). Reproduire ces contraintes applicativement dans un magasin NoSQL aurait déplacé le risque d'incohérence vers le code métier, sans que le volume de données du projet justifie un besoin d'échelle horizontale. PostgreSQL a en plus été choisi plutôt que MySQL pour des fonctionnalités concrètement utilisées : `JSONB` indexé en GIN pour le contenu flexible (`LessonBlock.content`, `Question.metadata`), génération d'UUID côté base (`pgcrypto`), et verrous consultatifs (`pg_advisory_xact_lock`).

**Point technique à retenir** : le choix PostgreSQL n'est pas « par défaut » — il est justifié par des fonctionnalités réellement exploitées dans le code (JSONB, UUID natifs, verrous consultatifs), pas seulement par la familiarité.

**Question piège / relance possible** : Le JSONB n'introduit-il pas une perte de typage fort par rapport à des colonnes classiques ? — Si, c'est un compromis assumé sur les champs qui varient réellement selon un type (`Question.metadata` : `{maxLength}` uniquement pour `ESSAY`, `null` sinon) — créer une colonne dédiée par type de question aurait ajouté beaucoup de colonnes rarement remplies pour un seul paramètre optionnel.

---

**Question du jury** : Aucune des 39 entités n'utilise `@ManyToMany` — c'est un hasard ou un choix ?

**Réponse recommandée** : C'est un choix de modélisation constant et vérifié dans tout le projet. Chaque relation many-to-many métier réelle porte en pratique une donnée propre à l'association que `@ManyToMany` seul ne peut pas exprimer — une date de lecture pour `ConversationParticipant`, une date d'obtention et un code de partage pour `UserBadge`, un statut d'envoi pour `EmailCampaignRecipient`. Le projet passe donc systématiquement par une entité de jonction explicite plutôt que par une table de jointure pure qu'il faudrait migrer plus tard pour y ajouter cette donnée.

**Point technique à retenir** : c'est une anticipation délibérée — repartir d'une entité de jonction dès le départ évite une migration de schéma plus tard quand le besoin d'attribut supplémentaire sur l'association apparaît (ce qui arrive presque toujours).

**Question piège / relance possible** : Existe-t-il un cas où une vraie relation many-to-many sans attribut propre aurait été plus simple avec `@ManyToMany` ? — Possiblement pour une relation purement binaire sans aucune métadonnée future prévisible, mais aucun cas de ce type n'a été identifié dans le domaine réel du projet — chaque relation observée a fini par avoir besoin d'au moins un attribut propre.

---

**Question du jury** : Comment garantissez-vous qu'un apprenant n'a qu'un seul certificat par formation ?

**Réponse recommandée** : Par une contrainte SQL, pas seulement par une vérification applicative : `UNIQUE (user_id, formation_id)` est posée dès la migration `V1` sur la table `certificates`. Le code applicatif (`CertificateService.tryIssueIfEligible`) vérifie bien d'abord qu'aucun certificat n'existe déjà avant d'en créer un, mais même si cette vérification applicative avait un trou (race condition, bug), la contrainte d'intégrité en base empêcherait physiquement l'insertion d'un doublon.

**Point technique à retenir** : la règle métier la plus critique du projet (un certificat par formation) est portée à deux niveaux — code et contrainte de base — la contrainte SQL restant le dernier filet de sécurité si le code applicatif échoue.

**Question piège / relance possible** : Que se passerait-il si deux requêtes concurrentes tentaient de créer un certificat pour le même apprenant en même temps ? — La contrainte `UNIQUE` ferait échouer la seconde insertion avec une violation de contrainte, remontée comme une exception SQL — ce cas précis n'a pas de gestion applicative dédiée (pas de retry ou de message d'erreur spécifique), c'est une limite qui pourrait être améliorée par un `try/catch` ciblé sur cette violation.

---

**Question du jury** : `ddl-auto: validate` — que se passe-t-il si un développeur ajoute un champ à une entité JPA sans écrire la migration Flyway correspondante ?

**Réponse recommandée** : L'application refuse de démarrer — Hibernate compare le schéma attendu (déduit des entités) au schéma réel de la base, et toute divergence (colonne manquante, type incompatible) fait échouer le démarrage avec un message explicite, plutôt que de laisser Hibernate improviser un DDL comme le ferait `ddl-auto: update`. C'est une garantie forte que le schéma réel n'a qu'une seule source de vérité — les migrations Flyway — jamais une génération implicite par le code Java.

**Point technique à retenir** : ce mode « fail-fast » transforme un oubli de migration en erreur de démarrage immédiate et explicite plutôt qu'en bug silencieux découvert bien plus tard en production.

**Question piège / relance possible** : Cela ne ralentit-il pas le développement (obligation d'écrire une migration pour chaque petit changement) ? — Un peu, oui, mais c'est un coût accepté pour la garantie qu'apporte ce mode — et en pratique, la contrainte oblige à documenter systématiquement l'évolution du schéma, ce qui s'est avéré utile pour comprendre l'historique du projet (par exemple retrouver pourquoi la banque de questions a été retirée en `V36`).

---

## F. Sécurité

**Question du jury** : Vous documentez vous-même une IDOR (Insecure Direct Object Reference) réelle sur `AssignmentService`. Pouvez-vous l'expliquer précisément, sans minimiser le problème ?

**Réponse recommandée** : Oui, c'est une vraie limite non corrigée, que j'assume complètement plutôt que de la découvrir en soutenance. `AssignmentService.gradeSubmission(submissionId, request, graderId)` et `.delete(assignmentId)` chargent l'entité par identifiant et agissent dessus sans aucune vérification que l'appelant (`graderId`) a un lien quelconque avec le module ou la formation concernée — seule une restriction de rôle au niveau du contrôleur (`@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")`) protège ces opérations. Concrètement : un formateur authentifié pourrait noter ou supprimer le devoir d'un module qu'il n'encadre pas, simplement en connaissant ou en devinant l'UUID de la soumission — le rôle est vérifié, la propriété de la ressource ne l'est pas.

**Point technique à retenir** : c'est précisément l'exception au principe appliqué partout ailleurs dans le projet (`MessagingService#assertAccess`, `NotificationService#markRead`, `LessonNoteService#requireOwnNote`, `StageService#assertCanUpload`) — la faille est d'autant plus significative qu'elle contraste avec une discipline par ailleurs respectée.

**Question piège / relance possible** : Pourquoi ne pas l'avoir corrigée avant la soutenance si vous l'aviez identifiée ? — Le correctif est simple en théorie (charger le module de la soumission, vérifier que le formateur y est bien affecté, avant d'autoriser la notation ou la suppression) mais nécessite de définir d'abord ce que signifie « être affecté à un module » pour un formateur — une notion qui n'existe pas encore explicitement dans le modèle de données actuel (contrairement à un apprenant, rattaché à un `LearnerGroup`). Je préfère documenter honnêtement la limite plutôt que d'ajouter un correctif partiel et mal pensé sous la pression du calendrier.

---

**Question du jury** : Comment corrigeriez-vous concrètement cette IDOR sur `AssignmentService` si vous aviez une semaine de plus ?

**Réponse recommandée** : Trois étapes. D'abord, définir formellement la notion d'« encadrant d'un module » (probablement une nouvelle table de jonction `ModuleFormateur` ou un champ sur `ModuleEntity`, puisque le projet évite `@ManyToMany` nu — voir section E). Ensuite, écrire une méthode `assertCanGradeAssignment(assignmentId, formateurId)` dans `AssignmentService`, sur le modèle exact de `MessagingService#assertAccess`, appelée en préambule de `gradeSubmission` et `delete`. Enfin, écrire un test unitaire qui reproduit explicitement le scénario d'IDOR (un formateur B tente de noter un devoir du module encadré par le formateur A) pour garantir la non-régression — exactement le type de test qui manque aujourd'hui sur ce service.

**Point technique à retenir** : la correction suivrait un patron déjà éprouvé ailleurs dans le code (`assertAccess`), ce n'est pas un problème d'architecture à réinventer, seulement un oubli d'application du patron existant.

**Question piège / relance possible** : `ADMIN`/`SUPER_ADMIN` devraient-ils être exemptés de cette vérification, comme le staff l'est dans `MessagingService` pour les salons de cohorte ? — Oui, très probablement — un directeur pédagogique doit pouvoir intervenir sur n'importe quel module, contrairement à un simple formateur qui ne devrait agir que sur les siens ; la vérification devrait donc distinguer les rôles, sur le même modèle que `assertAccess` qui laisse le staff accéder à tout salon de cohorte sans vérification de groupe.

---

**Question du jury** : Le secret TOTP est stocké en clair en base. N'est-ce pas une faille de sécurité grave pour un mécanisme de 2FA ?

**Réponse recommandée** : C'est une vraie limite, oui, et je la reconnais sans détour : `AuthService.enableTotp()` persiste `user.getTotpSecret()` sans chiffrement au repos. Concrètement, une fuite de la base de données permettrait à un attaquant de régénérer les codes 2FA valides de n'importe quel compte l'ayant activée — ce qui neutraliserait entièrement la protection 2FA pour ces comptes en cas de compromission de la base, un scénario que la 2FA est justement censée couvrir en partie (protéger même si le mot de passe fuite).

**Point technique à retenir** : la 2FA protège efficacement contre un mot de passe volé/deviné (le scénario principal visé), mais pas contre une fuite complète de la base — ce sont deux modèles de menace différents, et je le dis clairement plutôt que de survendre la protection.

**Question piège / relance possible** : Comment corrigeriez-vous cela concrètement ? — En chiffrant `totpSecret` au repos avec une clé de chiffrement symétrique (AES-GCM par exemple) gérée hors base — typiquement via `@Convert` JPA avec un `AttributeConverter` qui chiffre/déchiffre automatiquement à la lecture/écriture, sur le même principe que `MEDIA_SIGNING_SECRET` qui est déjà une variable d'environnement dédiée dans ce projet. Le mot de passe, lui, est déjà correctement haché en BCrypt — c'est bien le secret TOTP spécifiquement qui manque de cette protection, pas l'ensemble des données sensibles.

---

**Question du jury** : Pourquoi le mot de passe est-il haché en BCrypt mais pas le secret TOTP ? N'est-ce pas incohérent ?

**Réponse recommandée** : C'est effectivement une incohérence de traitement, et la réponse honnête est que ce n'est pas un choix technique justifié — c'est un oubli. La différence technique est que BCrypt est un hachage à sens unique (on ne récupère jamais le mot de passe original, on compare seulement des hachages), alors que le secret TOTP doit être récupéré en clair pour générer le code attendu à chaque vérification (`HMAC-SHA1` sur le secret + le compteur de temps) — un hachage à sens unique serait donc inutilisable ici, il faudrait un **chiffrement réversible**, pas un hachage. Mais ce chiffrement réversible n'a simplement pas été implémenté.

**Point technique à retenir** : ne jamais répondre « il faudrait le hacher comme le mot de passe » — TOTP a besoin d'un secret récupérable en clair pour fonctionner, donc la solution est le chiffrement réversible (avec gestion de clé externe), pas le hachage.

**Question piège / relance possible** : Le projet utilise-t-il déjà un mécanisme de chiffrement réversible ailleurs qui pourrait être réutilisé ? — Pas directement pour des données en base, mais le projet a déjà une pratique de secrets externalisés en variable d'environnement (`MEDIA_SIGNING_SECRET`, `JWT_SECRET`) — la même approche (une clé de chiffrement en variable d'environnement, jamais commitée) pourrait porter la clé de chiffrement du secret TOTP.

---

**Question du jury** : Le RBAC (`@PreAuthorize`) protège-t-il suffisamment les données d'un utilisateur ?

**Réponse recommandée** : Non, et c'est le principe même de la section 3 de `07-securite.md` : le RBAC prouve un rôle (« l'appelant est un ÉTUDIANT »), jamais la propriété d'une ressource précise (« cette note appartient à cet étudiant précis »). Sans vérification de propriété, un apprenant pourrait changer un UUID dans l'URL pour accéder à une ressource d'un autre utilisateur — c'est la classe de vulnérabilité IDOR. Le projet applique donc un principe de défense en profondeur : `@PreAuthorize` pour le rôle, plus une vérification explicite de propriété dans le service pour les ressources personnelles — sauf, précisément, `AssignmentService`, qui est l'exception documentée.

**Point technique à retenir** : le RBAC et le contrôle de propriété sont deux mécanismes complémentaires qui répondent à deux questions différentes — confondre les deux est l'erreur de sécurité la plus fréquente sur ce type d'architecture.

**Question piège / relance possible** : `LessonNoteService` va plus loin que les autres services — pourquoi même le staff n'a-t-il pas accès aux notes personnelles d'un apprenant ? — Parce qu'une note de leçon est un espace strictement personnel (l'équivalent d'un brouillon privé), sans valeur pédagogique à partager avec le staff, contrairement à un dossier de stage ou une conversation de cohorte où le staff a un rôle de supervision légitime — la distinction entre « donnée strictement privée » et « donnée supervisée par le staff » est donc traitée au cas par cas selon le sens métier de chaque ressource.

---

**Question du jury** : Le CSRF est explicitement désactivé (`csrf.disable()`). Comment justifiez-vous ça devant un jury qui connaît OWASP ?

**Réponse recommandée** : L'API est stateless et authentifiée par JWT — la protection CSRF de Spring Security, pensée pour les sessions basées sur cookie de session classique, ne s'applique pas directement à ce modèle. Mais je reconnais que le cookie JWT est lui aussi transmis automatiquement par le navigateur, donc un risque CSRF résiduel existe en théorie. Il est mitigé par deux mécanismes : `SameSite=Lax` sur le cookie (non transmis sur une requête cross-site déclenchée par POST/PUT/PATCH/DELETE depuis un site tiers, seule la navigation de premier niveau le transmet), et la politique CORS qui bloque les origines non explicitement listées. Ce n'est pas équivalent à un jeton CSRF dédié (double-submit cookie), et je ne prétends pas le contraire.

**Point technique à retenir** : `SameSite=Lax` + CORS strict est une mitigation réelle mais partielle — un jeton CSRF explicite reste l'amélioration standard si le niveau d'exigence de sécurité devait monter (par exemple avant un déploiement en production réelle avec des données sensibles).

**Question piège / relance possible** : Un navigateur très ancien qui ne respecte pas `SameSite` exposerait-il l'application au CSRF ? — Oui en théorie — c'est une dépendance à un comportement de navigateur moderne plutôt qu'à un mécanisme cryptographique indépendant du client, ce qui est une limite réelle de cette approche comparée à un jeton CSRF applicatif.

---

**Question du jury** : Un JWT volé peut-il être révoqué avant son expiration ?

**Réponse recommandée** : Non — il n'existe pas de blocklist côté serveur dans ce projet. Un JWT volé (ou un compte désactivé par un admin) reste valide jusqu'à son expiration naturelle, 24 heures par défaut. C'est un compromis assumé de l'architecture stateless : ajouter une révocation nécessiterait de maintenir un état côté serveur (une liste de jetons invalidés dans Redis, vérifiée à chaque requête), ce qui réintroduirait une forme d'état partagé que le choix JWT stateless cherchait justement à éviter.

**Point technique à retenir** : Redis serait l'endroit naturel pour implémenter cette blocklist si elle devenait nécessaire — l'infrastructure de rate limiting Redis est déjà en place et pourrait porter cette fonctionnalité sans nouvelle dépendance.

**Question piège / relance possible** : Une expiration de 24h n'est-elle pas longue pour un token de session sans possibilité de révocation ? — C'est un compromis entre sécurité et expérience utilisateur (éviter une reconnexion trop fréquente) ; réduire l'expiration limiterait la fenêtre de risque mais dégraderait l'UX sans résoudre le problème de fond — un refresh token à courte durée de vie combiné à un token d'accès très court serait l'amélioration standard, non implémentée ici.

---

**Question du jury** : Comment le rate limiting protège-t-il concrètement contre l'abus de l'API de génération de questions par IA ?

**Réponse recommandée** : `RateLimitService.checkAiGenerationAllowed` limite chaque utilisateur à 20 générations par 5 minutes, via un compteur atomique Redis (`INCR` + `EXPIRE` sur la première requête de la fenêtre). Sans cette limite, un formateur (ou un compte compromis) pourrait déclencher un grand nombre d'appels vers une API tierce payante (Gemini/Grok) en quelques secondes — un risque financier direct puisque chaque appel a un coût côté fournisseur.

**Point technique à retenir** : la limitation protège un coût financier réel (appel à une API tierce payante), pas seulement une charge technique — c'est la distinction qui justifie pourquoi ce cas d'usage précis a sa propre limite dédiée parmi les huit cas couverts par `RateLimitService`.

**Question piège / relance possible** : Le rate limiting par utilisateur peut-il être contourné en créant plusieurs comptes ? — Oui en théorie — la limite est par `userId`, pas par appareil ni par IP pour ce cas d'usage précis ; créer plusieurs comptes contournerait la limite, ce qui est une limite reconnue du mécanisme actuel (contrairement au login/l'inscription, qui sont eux limités par IP).

---

**Question du jury** : Il n'existe pas de rate limiting générique sur l'ensemble de l'API — n'est-ce pas un risque de déni de service ?

**Réponse recommandée** : C'est une limite réelle, oui — seuls huit cas d'usage précis sont protégés (login, inscription, réinitialisation de mot de passe, renvoi de vérification, messages, assistant IA, génération IA, upload), choisis parce qu'ils représentent soit un risque de brute-force (login), soit un coût direct (appels IA), soit un risque de spam (messages, campagnes). Le reste de l'API n'a aucune limite de débit générique — un attaquant déterminé pourrait en théorie saturer un endpoint de lecture non protégé.

**Point technique à retenir** : la stratégie suivie est « protéger ce qui a un coût ou un risque d'abus identifié », pas « protéger uniformément toute l'API » — un rate limiting générique (par exemple au niveau du reverse proxy Nginx une fois activé) serait l'amélioration naturelle en production.

**Question piège / relance possible** : Nginx, une fois activé, pourrait-il combler ce manque ? — Oui, `deploy/nginx/conf.d/elearning.conf` ne configure aujourd'hui aucune directive `limit_req`, mais Nginx est l'endroit naturel pour ajouter une limitation de débit générique par IP en amont de l'application, sans modifier le code Spring Boot — une piste d'amélioration identifiée mais non implémentée.

---

**Question du jury** : Comment le mot de passe par défaut des comptes importés (`APP_DEFAULT_RESET_PASSWORD`) est-il sécurisé ?

**Réponse recommandée** : Les comptes créés par import en masse (cohortes présentielles, Excel) démarrent avec un mot de passe partagé identique (`IatReset@123` par défaut) tant que l'apprenant n'a pas complété son profil. C'est un risque assumé — n'importe qui connaissant ce mot de passe par défaut et un email/matricule valide pourrait se connecter à un compte non encore activé — mitigé par le fait que `completeProfile()` rejette explicitement toute tentative de garder ce mot de passe par défaut comme mot de passe final, forçant le changement au premier login réel.

**Point technique à retenir** : la fenêtre de risque est limitée dans le temps (entre l'import et la première connexion réelle de l'apprenant), pas permanente — mais elle existe réellement tant que l'apprenant n'a pas changé son mot de passe.

**Question piège / relance possible** : Que se passe-t-il si un apprenant ne se connecte jamais après l'import ? — Le compte reste dans cet état de risque indéfiniment — aucune expiration automatique de ce mot de passe par défaut n'est implémentée ; c'est une limite réelle qui pourrait être améliorée par une politique d'expiration ou un envoi automatique d'un lien de première connexion à usage unique plutôt qu'un mot de passe partagé statique.

---

## G. Infrastructure et déploiement

**Question du jury** : Le README annonce Java 21+ comme prérequis, mais `pom.xml` déclare `<java.version>17</java.version>`. Lequel est vrai, et comment expliquez-vous cette incohérence ?

**Réponse recommandée** : Les deux informations coexistent réellement dans le dépôt — je ne cherche pas à la masquer. Le code compile et s'exécute réellement en cible Java 17 (`pom.xml`, et `backend/Dockerfile` construit avec `eclipse-temurin:17-jdk`/`17-jre`) — c'est la vérité technique du binaire produit. Le README, lui, recommande Java 21+ comme version d'outil à installer sur la machine du développeur, probablement pour anticiper une montée de version future ou parce que le JDK 21 (LTS) est la version couramment installée aujourd'hui — mais rien dans le build n'exige réellement 21, et un JDK 17 suffit à compiler et exécuter le projet tel quel.

**Point technique à retenir** : en cas de doute entre une documentation et le code, le code (`pom.xml`, `Dockerfile`) fait foi — c'est la vérité vérifiable, la documentation peut dériver sans que personne ne s'en aperçoive.

**Question piège / relance possible** : Est-ce grave, concrètement ? — Non, un JDK 21 exécute sans problème un bytecode ciblant Java 17 (rétrocompatibilité binaire) — un développeur qui suit le README (installe Java 21) n'aura aucun souci pour builder le projet ; c'est une incohérence documentaire à corriger (aligner le README sur `pom.xml`, ou monter réellement `java.version` à 21 si l'intention était de l'utiliser), pas un bug fonctionnel.

---

**Question du jury** : Où en est le projet sur le CI/CD ? Y a-t-il des tests automatisés qui tournent à chaque push ?

**Réponse recommandée** : Non, il n'existe aujourd'hui aucun pipeline CI/CD dans le dépôt — pas de dossier `.github/workflows/`, pas de `.gitlab-ci.yml`, pas de Jenkinsfile. Les commandes de build/test/lint (`./mvnw -q test`, `npx tsc --noEmit`, `npx eslint`, `npm run build`, `npm run test`) sont exécutées manuellement par moi avant chaque commit, selon la règle que je me suis imposée dans le `CLAUDE.md` du projet — mais rien ne le vérifie automatiquement côté serveur. C'est une lacune réelle et je le reconnais sans détour : rien n'empêche techniquement un commit cassé d'être poussé si je manque de rigueur un jour donné.

**Point technique à retenir** : l'absence de CI/CD est une perspective d'évolution identifiée, pas un oubli caché — le pipeline manquant est même décrit précisément (backend : `./mvnw -q test` + `./mvnw -q compile` ; frontend : `tsc --noEmit` + `eslint` + `build` + `test`, à chaque push/pull request).

**Question piège / relance possible** : Pourquoi ne pas l'avoir mis en place, ça prend pourtant peu de temps avec GitHub Actions ? — C'est une priorisation assumée du temps disponible pendant le stage : j'ai choisi de consacrer le temps restant à la robustesse fonctionnelle (règles métier, sécurité) plutôt qu'à l'outillage d'intégration continue, sachant que la discipline manuelle (`CLAUDE.md`) compensait partiellement en attendant — mais je reconnais que c'est la première chose que j'ajouterais avec du temps supplémentaire, avant même de nouvelles fonctionnalités.

---

**Question du jury** : Quelle est la topologie de déploiement en production de cette application ? Où tourne-t-elle réellement aujourd'hui ?

**Réponse recommandée** : Elle ne tourne nulle part en production réelle aujourd'hui — c'est un MVP académique, testé en local et vérifié fonctionnellement, mais jamais déployé sur un hébergement réel. `README.md` mentionne une seule intention informelle (« Docker Compose · Hostinger VPS ») dans un tableau de présentation de la stack, sans aucune configuration technique correspondante : pas d'IP, pas de nom de domaine, pas de script de provisioning, pas de fichier d'inventaire. Le `docker-compose.yml` actuel ne démarre même que Postgres et Redis — le service `api` y est présent mais entièrement commenté, en attente d'activation.

**Point technique à retenir** : la trajectoire de déploiement est documentée et anticipée dans la configuration (Dockerfile backend prêt, config Nginx prête, bloc de service commenté) mais pas exécutée — c'est une cible, pas un existant, et le dire clairement évite de laisser croire à un déploiement qui n'existe pas.

**Question piège / relance possible** : Que manque-t-il concrètement pour déployer réellement en production ? — Trois choses : écrire `frontend/Dockerfile` (inexistant à ce jour), décommenter/étendre le service `api` dans `docker-compose.yml` et ajouter les services `frontend`/`nginx`, puis choisir et provisionner réellement un hébergement (VPS Hostinger ou autre) avec un nom de domaine et un certificat TLS — aucune de ces trois étapes n'est faite aujourd'hui.

---

**Question du jury** : Pourquoi Nginx est-il configuré mais pas activé dans Docker Compose ?

**Réponse recommandée** : Le fichier `deploy/nginx/conf.d/elearning.conf` a été écrit à l'avance comme cible de déploiement (reverse proxy vers `api:8080` et `frontend:3000`, gestion de la taille d'upload, terminaison TLS prévue), mais le `docker-compose.yml` actuel ne démarre que Postgres et Redis en développement — backend et frontend tournent en local hors conteneur (`spring-boot:run`, `npm run dev`). Activer Nginx n'a de sens qu'une fois les services `api` et `frontend` eux-mêmes conteneurisés, ce qui n'est pas encore fait.

**Point technique à retenir** : le commentaire du `docker-compose.yml` lui-même l'assume littéralement (« API & frontend services will be enabled in a later step ») — ce n'est pas une découverte du jury, c'est écrit noir sur blanc dans le fichier de configuration.

**Question piège / relance possible** : Le fichier Nginx a-t-il au moins été testé une fois, même manuellement ? — Non, ce fichier de configuration n'a pas été vérifié en conditions réelles avec les services `api`/`frontend` réellement conteneurisés — c'est une configuration écrite par anticipation, pas encore validée en exécution ; une des toutes premières choses à faire avant d'aller plus loin serait de la tester une fois les Dockerfiles frontend et le service `api` décommentés.

---

**Question du jury** : Comment garantissez-vous la disponibilité (availability) du service si un composant tombe en panne ?

**Réponse recommandée** : Aujourd'hui, à l'échelle d'un MVP académique, la disponibilité repose uniquement sur les healthchecks Docker (`pg_isready`, `redis-cli ping`) et sur `/actuator/health` côté applicatif, plus le caractère stateless du backend (JWT porté par le client, pas de session en mémoire), qui permettrait en théorie un redémarrage sans perte de session utilisateur. Il n'existe aucune redondance active — pas de réplication PostgreSQL, pas de cluster Redis, pas de plusieurs instances de l'API — la haute disponibilité réelle (failover automatique) reste une perspective d'évolution, cohérente avec le fait que l'hébergement de production lui-même n'est pas encore finalisé.

**Point technique à retenir** : le design est compatible avec une montée en charge horizontale future (stateless + état partagé via Redis plutôt qu'en mémoire locale) même si cette capacité n'est pas exploitée aujourd'hui — c'est une propriété permise par l'architecture, pas une fonctionnalité déployée.

**Question piège / relance possible** : Si Redis tombait en panne aujourd'hui, l'application s'arrêterait-elle complètement ? — Le rate limiting et les verrous de progression dépendent de Redis — une panne Redis ferait probablement échouer ces opérations précises (avec une exception remontée par `GlobalExceptionHandler`), mais le cœur fonctionnel (contenu, quiz sans le verrou de démarrage concurrent) ne dépend pas structurellement de Redis pour fonctionner — ce comportement de dégradation partielle n'a cependant pas été testé explicitement en conditions de panne.

---

**Question du jury** : Le port PostgreSQL exposé côté hôte est 5433, pas 5432 — un détail anodin ou signifiant ?

**Réponse recommandée** : Signifiant pour l'expérience de développement, anodin pour la sécurité. C'est documenté explicitement dans `README.md` : ce décalage évite un conflit avec une instance PostgreSQL déjà installée nativement sur la machine du développeur (cas fréquent sous Windows, où PostgreSQL s'installe souvent comme service système sur le port standard). Le port interne au réseau Docker reste `5432` — seul le mapping vers l'hôte diffère.

**Point technique à retenir** : c'est un détail pratique de confort développeur, pas une mesure de sécurité — la sécurité de la base repose sur les identifiants et l'absence d'exposition publique, pas sur l'obscurité du numéro de port.

**Question piège / relance possible** : Ce choix de port devrait-il changer en production ? — Non, en production le port hôte n'a pas besoin d'être exposé du tout si l'API tourne dans le même réseau Docker que Postgres (résolution par nom de service `postgres:5432`) — le mapping `5433:5432` n'a de sens qu'en développement local où le backend tourne hors conteneur et doit atteindre Postgres via `localhost`.

---

## H. Choix technologiques et alternatives

**Question du jury** : Si vous deviez refaire ce projet aujourd'hui en changeant un choix technologique majeur, lequel changeriez-vous et pourquoi ?

**Réponse recommandée** : Probablement l'ajout d'un pipeline CI/CD dès le premier mois plutôt qu'en fin de projet — pas un choix de langage ou de framework, mais une pratique d'ingénierie. Techniquement, je garderais Spring Boot et Next.js : les deux ont bien servi le projet. Le point que je changerais le plus volontiers dans le code lui-même est de définir dès le départ une relation explicite « formateur ↔ module encadré », qui aurait évité a posteriori la faille IDOR sur `AssignmentService` — un manque de modélisation initiale plutôt qu'un mauvais choix de techno.

**Point technique à retenir** : les choix technologiques du projet (Spring Boot, Next.js, PostgreSQL, Redis) sont justifiés et je les referais — les limites du projet sont plutôt des manques de couverture (tests, IDOR, chiffrement TOTP) que des erreurs d'architecture.

**Question piège / relance possible** : N'est-ce pas une réponse trop confortable, qui évite de remettre en cause un vrai choix technique ? — Je peux citer un vrai regret technique si le jury insiste : ne pas avoir mis en place `@EntityGraph` ou une stratégie de fetch plus systématique dès le départ, plutôt que de traiter chaque `LazyInitializationException` au cas par cas au fur et à mesure qu'elle apparaissait en conditions réelles.

---

**Question du jury** : Pourquoi Redis plutôt qu'une solution en mémoire (cache local Java, `ConcurrentHashMap`) pour le rate limiting ?

**Réponse recommandée** : Un compteur en mémoire locale au processus ne survivrait pas à un redémarrage de l'application et, surtout, ne serait pas partagé si plusieurs instances de l'API tournaient derrière un load balancer — chaque instance aurait son propre compteur, permettant à un attaquant de multiplier ses tentatives par le nombre d'instances. Redis centralise cet état partagé indépendamment du nombre d'instances backend, ce qui rend le rate limiting correct même dans un scénario de montée en charge horizontale future — cohérent avec le caractère globalement stateless du backend.

**Point technique à retenir** : Redis n'est utilisé dans ce projet que comme magasin technique (rate limiting, verrous), jamais comme source de vérité des données métier — cette distinction est explicite dans l'architecture du projet.

**Question piège / relance possible** : Le compteur Redis (`INCR`+`EXPIRE`) est-il atomique et donc sûr en cas de concurrence ? — `INCR` est atomique côté Redis par nature (opération native mono-thread sur une clé) ; la petite fenêtre entre `INCR` et la pose de l'expiration (`EXPIRE`, seulement à la première requête, `count == 1`) est un point théoriquement non atomique, mais son impact réel est négligeable (au pire une clé sans TTL pendant une fraction de seconde) — un script Lua unique combinant les deux opérations serait la version strictement atomique, non implémentée ici par simplicité.

---

**Question du jury** : Pourquoi ne pas avoir utilisé GraphQL plutôt que REST, vu la richesse du modèle de données ?

**Réponse recommandée** : REST correspond naturellement au découpage en ressources du domaine (utilisateurs, quiz, modules, badges), s'appuie directement sur les méthodes HTTP standard gérées nativement par Spring Web, et s'intègre simplement avec Spring Security pour l'autorisation par route/méthode via `@PreAuthorize`. GraphQL aurait apporté un vrai bénéfice si le frontend avait eu un besoin fort de composer des requêtes flexibles multi-ressources en un seul aller-retour (typiquement un tableau de bord très composite) — ce n'était pas le principal point de friction observé ici, où chaque page consomme des endpoints assez ciblés.

**Point technique à retenir** : le choix REST n'élimine pas un vrai sur-fetching ponctuel (certaines réponses DTO sont volumineuses, comme `UserResponse` à 27 composants), mais ce coût reste acceptable au regard de la simplicité d'implémentation gagnée.

**Question piège / relance possible** : `UserResponse` avec 27 champs n'est-il pas un signe que REST montre ses limites ici ? — C'est un signal réel de sur-fetching sur cet endpoint précis, oui — un endpoint GraphQL aurait permis au frontend de ne demander que les champs réellement affichés à un instant donné ; ce n'est cependant qu'un seul DTO sur 138, pas un problème généralisé qui justifierait de migrer toute l'API.

---

**Question du jury** : Pourquoi avoir codé le TOTP à la main (`TotpService`) plutôt que d'utiliser une bibliothèque existante ?

**Réponse recommandée** : RFC 6238 (TOTP) est un algorithme relativement simple et bien spécifié — HMAC-SHA1 sur un compteur de temps, tronqué en un code à 6 chiffres — qui ne justifiait pas une dépendance externe supplémentaire pour une implémentation d'une taille raisonnable. Cela dit, je reconnais que c'est un choix qui demande une vigilance particulière : une implémentation maison d'un algorithme de sécurité, même simple, porte un risque de bug subtil (par exemple sur la fenêtre de tolérance temporelle) qu'une bibliothèque éprouvée et largement testée par la communauté aurait limité.

**Point technique à retenir** : l'implémentation reste compatible avec les applications d'authentification standard (Google Authenticator, Authy), ce qui a été vérifié en conditions réelles — ce n'est pas une variante propriétaire incompatible avec l'écosystème.

**Question piège / relance possible** : Avez-vous testé cette implémentation contre un vecteur de test officiel RFC 6238 ? — Ce n'est pas documenté explicitement comme un test de conformité formel avec les vecteurs de test publiés dans la RFC — c'est une limite de rigueur que je reconnais ; la vérification a été faite par compatibilité pratique avec de vraies applications d'authentification plutôt que par des vecteurs de test normalisés.

---

**Question du jury** : Pourquoi ne pas avoir utilisé un ORM plus léger ou du SQL brut plutôt que Spring Data JPA/Hibernate ?

**Réponse recommandée** : Le domaine a suffisamment d'associations (39 entités, relations `@ManyToOne`/`@OneToMany` avec cascades) pour que la génération automatique de requêtes par Spring Data JPA (méthodes dérivées, `@Query` JPQL) élimine un volume important de boilerplate JDBC répétitif, tout en gardant la possibilité d'écrire du SQL natif quand c'est nécessaire (`pg_advisory_xact_lock`). Un accès SQL brut partout aurait donné plus de contrôle fin sur chaque requête, au prix d'un code beaucoup plus verbeux pour les cas simples (80% des repositories sont de simples méthodes dérivées à une ligne).

**Point technique à retenir** : le projet ne s'interdit jamais le SQL natif quand JPQL ne suffit pas — c'est un compromis pragmatique, pas un dogme « tout ORM » ou « tout SQL ».

**Question piège / relance possible** : L'ORM ne cache-t-il pas des requêtes N+1 potentiellement coûteuses ? — C'est un risque réel reconnu explicitement (`04-backend.md`, Q17) : il n'y a pas de protection générique contre le N+1 (`@EntityGraph` n'est utilisé nulle part) — le projet traite ce problème au cas par cas, uniquement là où il a été identifié (`CertificateRepository` avec `JOIN FETCH`), pas par une stratégie systématique appliquée à tout le modèle.

---

## I. Tests

**Question du jury** : Quelle est votre stratégie de tests globale, et quelle est sa couverture réelle ?

**Réponse recommandée** : Deux niveaux distincts. Côté backend, une suite JUnit5 + Mockito, avec un fichier de test par service dans `backend/src/test/` — les services les plus critiques (génération IA, assistant de cours) ont des tests dédiés qui stubbent l'appel réseau via `Mockito.spy()` sur les méthodes package-private `callGemini`/`callGrok`, sans jamais contacter les vraies API. Côté frontend, Vitest + React Testing Library pour l'unitaire/composant, et Playwright pour l'e2e contre un vrai backend. La couverture n'est cependant pas exhaustive : elle est concentrée sur les services à logique métier dense plutôt que répartie uniformément sur les 46 services et l'ensemble des composants frontend.

**Point technique à retenir** : la priorité de test a été donnée aux endroits où un bug serait le plus coûteux silencieusement (progression, IA avec repli, verrouillage de concurrence), pas à une couverture chiffrée uniforme.

**Question piège / relance possible** : Quel est le taux de couverture de code exact (pourcentage) ? — Aucun outil de mesure de couverture (JaCoCo côté backend, Istanbul/c8 côté frontend) n'est configuré dans le projet à ce jour — je ne peux donc pas donner un pourcentage exact, c'est une lacune d'outillage que je reconnais plutôt que d'avancer un chiffre inventé.

---

**Question du jury** : Pourquoi les méthodes `callGemini`/`callGrok` sont-elles package-private plutôt que privées — n'est-ce pas un compromis sur l'encapsulation au profit des tests ?

**Réponse recommandée** : Oui, c'est très exactement ça, et c'est un compromis assumé plutôt qu'un oubli — le commentaire du code le dit explicitement. Rendre une méthode privée testable isolément sans `Mockito.spy()` nécessiterait soit d'extraire l'appel réseau dans une interface séparée injectée (plus de cérémonie pour un seul appel `RestClient`), soit un framework de mock plus lourd (PowerMock) pour contourner l'encapsulation stricte. Le package-private est le compromis le plus léger : la méthode reste inaccessible depuis un autre package (donc pas vraiment « publique » au sens de l'API du service), mais reste stubbable directement en test.

**Point technique à retenir** : ce pattern est répété à l'identique dans deux services distincts (`QuestionGenerationService`, `CourseAssistantService`) — c'est une convention du projet, documentée dans le `CLAUDE.md`, pas une solution ad hoc à un seul endroit.

**Question piège / relance possible** : Ce compromis ne fragilise-t-il pas l'encapsulation pour tout le reste du code qui vit dans le même package ? — En théorie oui — n'importe quelle classe du même package `service` pourrait appeler `callGemini` directement en contournant la logique de repli de `generate()`. En pratique ce risque ne s'est pas matérialisé (aucun appel de ce type trouvé ailleurs dans le code), mais c'est un vrai coût architectural du choix, pas un compromis sans contrepartie.

---

**Question du jury** : Comment le test de charge sur la concurrence de démarrage de quiz (`loadtest/quiz-start-concurrency.js`) fonctionne-t-il, et qu'est-ce qu'il prouve exactement ?

**Réponse recommandée** : Ce script envoie délibérément plusieurs requêtes `POST /{id}/start` simultanées pour le même couple utilisateur/quiz, reproduisant le scénario qui, sans le verrou `pg_advisory_xact_lock`, créerait plusieurs tentatives en doublon pour un même utilisateur. Il sert à démontrer empiriquement que le verrou fonctionne réellement en conditions de concurrence réelle, pas seulement en théorie sur le papier — un test unitaire classique avec Mockito ne pourrait pas reproduire une vraie race condition au niveau transaction/base de données.

**Point technique à retenir** : c'est le seul test de charge explicite du projet — il ne mesure pas la performance générale de l'API, seulement la correction d'un mécanisme de concurrence précis.

**Question piège / relance possible** : Ce test tourne-t-il en CI ou seulement manuellement ? — Manuellement uniquement, comme le reste de la suite de tests (voir section G, absence de CI/CD) — ce n'est pas un test automatisé intégré au pipeline de build, c'est un script à exécuter à la demande pour vérifier ce comportement précis.

---

**Question du jury** : Avez-vous des tests qui couvrent spécifiquement les scénarios de sécurité (IDOR, contrôle de propriété) ?

**Réponse recommandée** : Partiellement — certains services avec vérification de propriété ont des tests qui couvrent le cas « accès refusé » (par exemple vérifier qu'un `ForbiddenException` est bien levée par `MessagingService.assertAccess` quand l'utilisateur n'appartient pas à la conversation), mais je ne peux pas affirmer que cette couverture est systématique sur tous les services concernés. Sur `AssignmentService` précisément, où la faille IDOR est documentée, il n'existe justement pas de test qui aurait pu la détecter plus tôt — ce qui est cohérent avec le fait que la faille n'a pas été corrigée : l'absence de test et l'absence de correctif vont de pair ici.

**Point technique à retenir** : un test qui reproduit explicitement un scénario d'IDOR (utilisateur A tente d'agir sur une ressource de l'utilisateur B) serait à la fois un moyen de détecter la faille et une garantie de non-régression une fois corrigée — ce type de test manque spécifiquement sur `AssignmentService`.

**Question piège / relance possible** : Un test de sécurité automatisé (SAST, scan de dépendances) a-t-il été exécuté sur le projet ? — Non, aucun outil d'analyse statique de sécurité (SAST) ni de scan de vulnérabilités des dépendances (`npm audit`, `mvn dependency-check`) n'est intégré ou documenté comme exécuté régulièrement sur ce projet — c'est une pratique absente, cohérente avec l'absence plus large de CI/CD.

---

## J. Difficultés rencontrées et limites du projet

**Question du jury** : Quelle a été la difficulté technique la plus sérieuse rencontrée pendant le développement ?

**Réponse recommandée** : La réconciliation entre `open-in-view: false` et les associations paresseuses Hibernate accédées après la fin d'une transaction — un bug qui ne s'est révélé qu'en conditions réelles (le premier certificat réellement créé en base, jamais rencontré avant en démo) plutôt qu'en test. Le deuxième point difficile a été la logique de progression elle-même (`ProgressionService`, 369 lignes) : concilier deux parcours de déblocage distincts (apprenant en ligne vs apprenant en cohorte/groupe) dans une seule méthode cohérente, sans dupliquer la logique ni créer d'incohérence entre les deux chemins.

**Point technique à retenir** : les bugs les plus coûteux à diagnostiquer dans ce projet n'étaient pas des erreurs de logique évidentes, mais des effets de bord d'un choix de configuration global (`open-in-view`) qui ne se manifestent que dans un scénario de données précis.

**Question piège / relance possible** : Comment avez-vous diagnostiqué ce bug de `LazyInitializationException` — par les logs, un débogueur ? — Par le message d'exception Hibernate lui-même, explicite sur la cause (session fermée, association non initialisée) — une fois la cause comprise, la correction (`JOIN FETCH` dans le repository) était directe ; la vraie difficulté était de comprendre pourquoi ce cas précis n'était jamais apparu avant, ce qui a nécessité de faire le lien avec l'absence de données de démo comportant un vrai certificat.

---

**Question du jury** : Quelles fonctionnalités avez-vous dû abandonner ou retirer en cours de route, et pourquoi ?

**Réponse recommandée** : La « banque de questions » avec tirage aléatoire (introduite en migration `V24`) a été retirée douze migrations plus tard (`V36__drop_question_banks.sql`) — jugée redondante avec le mélange/réordonnancement des questions déjà existant sur un quiz (`randomizeQuestions`). C'est un exemple concret d'itération produit honnête : une fonctionnalité a été implémentée, puis jugée non nécessaire à l'usage, et retirée proprement plutôt que laissée en code mort — avec une nouvelle migration qui défait ce que l'ancienne avait fait, jamais une réécriture de l'historique.

**Point technique à retenir** : ce retrait est la preuve la plus concrète que la règle « jamais modifier une migration déployée » a été respectée même face à un changement de direction produit complet, pas seulement pour des ajustements mineurs.

**Question piège / relance possible** : Cette fonctionnalité était-elle mal conçue dès le départ, ou est-ce un vrai changement de besoin ? — C'est plutôt une évaluation a posteriori de la valeur ajoutée réelle : le mélange de questions existant couvrait déjà le besoin anti-triche visé par la banque de questions, qui ajoutait de la complexité de modélisation (une nouvelle entité, une nouvelle relation) sans bénéfice net suffisant pour la justifier — une leçon sur le coût de maintenir une fonctionnalité qui duplique partiellement un mécanisme existant.

---

**Question du jury** : Quelles sont, selon vous, les trois limites les plus sérieuses du projet aujourd'hui ?

**Réponse recommandée** : Dans l'ordre de gravité pour moi : (1) l'IDOR réelle sur `AssignmentService`, qui permettrait à un formateur d'agir sur un devoir hors de son périmètre — une vraie faille de sécurité, pas une simple lacune de confort ; (2) le secret TOTP stocké en clair en base, qui neutraliserait la 2FA en cas de fuite complète de la base de données ; (3) l'absence totale de CI/CD et de topologie de déploiement en production active, qui signifie que le projet, bien que fonctionnel, n'est techniquement pas prêt pour un déploiement réel sans travail supplémentaire.

**Point technique à retenir** : je classe volontairement les deux failles de sécurité avant le manque d'infrastructure — une IDOR ou un secret en clair sont des problèmes qui affecteraient des utilisateurs réels si le projet était déployé tel quel, alors que l'absence de CI/CD est un manque d'outillage sans impact direct sur un utilisateur final tant que le code reste correct manuellement.

**Question piège / relance possible** : Pourquoi ne pas avoir corrigé au moins l'IDOR avant la soutenance, si vous la jugez si grave ? — Parce que je préfère livrer un état honnêtement documenté plutôt qu'un correctif de dernière minute non testé sous pression de calendrier — corriger cette IDOR correctement nécessite d'abord de modéliser la relation formateur-module qui n'existe pas encore (voir section F), ce n'est pas un correctif d'une ligne ; je préfère l'assumer clairement à l'oral plutôt que de risquer d'introduire une régression pour cocher une case avant la soutenance.

---

**Question du jury** : Le rôle SUPPORT existe dans le modèle mais ne peut pas être attribué via l'interface admin. N'est-ce pas une fonctionnalité à moitié terminée ?

**Réponse recommandée** : C'est une limite de MVP assumée et documentée explicitement (`ch4_realisation.tex`, section « Limites identifiées »), pas un oubli caché. Le modèle et les contrôles d'accès associés à SUPPORT sont pleinement implémentés et fonctionnels (messagerie, lecture des statistiques) — seule la voie de promotion via l'interface admin (`AdminService.changeRole()`) est volontairement bloquée pour ce rôle précis, en attendant de clarifier le processus métier réel de nomination d'un compte SUPPORT (qui le crée, avec quelles garanties), qui n'a pas été figé avec l'école pendant le stage.

**Point technique à retenir** : le compte de démonstration porte ce rôle et permet de vérifier que tous les contrôles d'accès associés fonctionnent correctement, même si la création d'un nouveau compte SUPPORT via l'UI reste bloquée.

**Question piège / relance possible** : Combien de temps faudrait-il pour lever ce blocage ? — Techniquement, retirer le refus dans `AdminService.changeRole()` est trivial (quelques lignes) — la vraie question est métier, pas technique : définir qui a le droit de créer un compte SUPPORT et selon quel processus, ce qui dépasse le périmètre du code et nécessiterait une clarification avec l'équipe pédagogique de l'école.

---

**Question du jury** : Le projet a-t-il été validé par des utilisateurs réels (formateurs, apprenants) pendant le développement ?

**Réponse recommandée** : Le développement s'est appuyé sur une compréhension du fonctionnement réel du cursus IAT Academy (structure UF, rôle du directeur, processus de stage), mais je ne peux pas prétendre à une validation utilisateur formalisée (tests d'utilisabilité, retours structurés d'apprenants réels) au sens strict d'une démarche UX — c'est un projet de fin d'études avec un périmètre MVP, pas un produit ayant traversé un cycle complet de feedback utilisateur en conditions réelles.

**Point technique à retenir** : la fidélité du modèle métier (UF, gate directeur, stage) reflète une connaissance réelle du fonctionnement de l'école, mais la validation ergonomique de l'interface elle-même reste à faire avec de vrais utilisateurs finaux.

**Question piège / relance possible** : Comment savez-vous alors que l'interface est réellement utilisable par un apprenant peu à l'aise avec l'informatique ? — Je ne peux pas l'affirmer avec certitude sans test utilisateur réel — c'est une limite honnête à reconnaître ; la seule garantie apportée à ce stade est fonctionnelle (les parcours marchent techniquement), pas ergonomique au sens d'une validation UX formelle.

---

## K. Performance et scalabilité

**Question du jury** : Le backend pourrait-il supporter plusieurs milliers d'utilisateurs simultanés aujourd'hui ?

**Réponse recommandée** : L'architecture le permettrait structurellement — le backend est stateless (JWT, pas de session serveur), et l'état partagé nécessaire (rate limiting, verrous de concurrence) passe déjà par Redis plutôt que par de la mémoire locale au processus, ce qui autoriserait en théorie plusieurs instances de l'API derrière un load balancer sans perte de cohérence. Mais aucun test de charge réel à cette échelle n'a été mené — le seul test de charge du projet cible un scénario de concurrence précis (démarrage de quiz), pas un débit global. Je ne peux donc pas donner un chiffre de capacité réelle mesurée, seulement dire que l'architecture ne s'y oppose pas structurellement.

**Point technique à retenir** : « scalable en théorie par l'architecture » et « scalable démontré par la mesure » sont deux affirmations différentes — je ne confonds pas les deux devant le jury.

**Question piège / relance possible** : Quel serait le premier goulot d'étranglement probable à grande échelle ? — Probablement PostgreSQL sur les requêtes d'agrégat (classement de cohorte, statistiques admin) si le volume de tentatives de quiz devenait très important, faute d'index dédiés vérifiés sur ces requêtes spécifiques — un profilage réel serait nécessaire pour le confirmer plutôt que de le supposer.

---

**Question du jury** : Comment optimisez-vous les performances des requêtes qui touchent beaucoup de données (statistiques, classements) ?

**Réponse recommandée** : Ces requêtes utilisent des agrégats SQL calculés côté base plutôt que rapatriés puis calculés en Java — par exemple `averageScoreByGroupGroupedByUser` dans `QuizAttemptRepository`, qui fait un `GROUP BY` directement en JPQL plutôt que de charger toutes les tentatives puis de moyenner côté application. C'est le principe général suivi : laisser la base de données faire ce qu'elle fait efficacement (agrégation, filtrage), plutôt que de rapatrier des données brutes volumineuses pour les traiter en mémoire applicative.

**Point technique à retenir** : aucun cache applicatif (Redis en cache de lecture, cache Spring `@Cacheable`) n'est utilisé pour ces requêtes — chaque appel recalcule l'agrégat à la demande ; c'est une piste d'optimisation identifiable si la fréquence d'appel devenait un problème réel.

**Question piège / relance possible** : Ces requêtes d'agrégat ont-elles été testées avec un volume de données réaliste (des milliers de tentatives) ? — Non, pas de test de performance dédié avec un jeu de données volumineux généré artificiellement — la vérification s'est limitée à la correction fonctionnelle du résultat sur les données de démo, pas à son temps d'exécution sous charge.

---

**Question du jury** : Bunny Stream est utilisé pour la vidéo — pourquoi ne pas simplement servir les fichiers vidéo depuis le disque du serveur ?

**Réponse recommandée** : Servir une vidéo volumineuse directement depuis le disque applicatif consommerait la bande passante et les ressources du serveur backend pour un usage qui n'a rien à voir avec sa charge de travail principale (logique métier), et ne bénéficierait d'aucune distribution géographique (CDN) ni de streaming adaptatif (HLS, qui ajuste la qualité selon la connexion de l'apprenant). Bunny Stream gère cela nativement, avec un repli sur disque local prévu si le service n'est pas activé (`BUNNY_STREAM_ENABLED=false` par défaut) — donc le projet fonctionne sans dépendance vidéo externe obligatoire, mais avec une expérience de lecture moins optimisée dans ce mode.

**Point technique à retenir** : Bunny Stream a un flag `enabled` explicite séparé de sa clé API (contrairement à Gemini/Grok) parce qu'il détermine où une vidéo est physiquement stockée — un effet de bord persistant qu'une simple clé mal renseignée ne doit pas déclencher silencieusement.

**Question piège / relance possible** : Que se passe-t-il si Bunny Stream tombe en panne alors qu'il est activé ? — Il n'y a pas de repli automatique vers le disque local si Bunny est activé mais indisponible au moment d'un upload ou d'une lecture — c'est une limite reconnue explicitement dans `08-services-externes.md` ; la vidéo resterait indisponible jusqu'au rétablissement du service tiers.

---

**Question du jury** : Le polling de messagerie et l'absence de cache global (pas de React Query) — est-ce un problème de performance frontend actuellement mesuré ?

**Réponse recommandée** : Non, aucun problème de performance concret n'a été mesuré à l'usage réel — c'est une limite architecturale identifiée par anticipation (« cela ne passerait pas à très grande échelle »armed plutôt qu'un problème observé en conditions réelles), le volume d'utilisateurs du projet à ce stade (MVP académique) restant modeste. Je préfère le dire clairement : ce n'est pas un bug de performance corrigé, c'est un choix dont la limite théorique est connue mais qui n'a jamais été le facteur limitant en pratique jusqu'ici.

**Point technique à retenir** : ne jamais présenter une limite théorique anticipée comme un problème de performance réellement observé et corrigé — ce serait exagérer la maturité du diagnostic.

**Question piège / relance possible** : Comment sauriez-vous si ce problème apparaissait réellement en production ? — Aujourd'hui, aucun outil d'observabilité (APM, métriques de temps de réponse par endpoint) n'est en place pour le détecter automatiquement (voir section G, absence de monitoring au-delà du healthcheck) — c'est justement une des raisons pour lesquelles l'observabilité est une perspective d'évolution nécessaire avant tout déploiement réel à plus grande échelle.

---

## L. Améliorations futures et décisions techniques

**Question du jury** : Si le projet devait continuer après votre stage, quelles seraient vos trois priorités ?

**Réponse recommandée** : Dans l'ordre : (1) corriger la faille IDOR sur `AssignmentService` et chiffrer le secret TOTP au repos — les deux points de sécurité documentés et non corrigés ; (2) mettre en place un pipeline CI/CD minimal (tests + lint à chaque pull request) avant toute nouvelle fonctionnalité, pour empêcher une régression silencieuse ; (3) finaliser réellement la topologie de déploiement (Dockerfile frontend, activation du service `api`/`nginx` dans Docker Compose, choix effectif d'un hébergement) pour passer d'un MVP fonctionnel à un service réellement exploitable par l'école.

**Point technique à retenir** : je priorise systématiquement la sécurité avant l'infrastructure et avant les nouvelles fonctionnalités — un projet avec plus de fonctionnalités mais les mêmes failles de sécurité serait un mauvais compromis.

**Question piège / relance possible** : Et après ces trois priorités, quelle serait la prochaine fonctionnalité ? — Probablement transformer l'UF en véritable entité si l'école exprimait un besoin de porter des attributs propres sur une UF (prérequis inter-UF, description enrichie) — le chemin de migration progressive est déjà anticipé dans `05-base-de-donnees.md` (nouvelle table, backfill, remplacement des colonnes scalaires).

---

**Question du jury** : Comment feriez-vous évoluer la messagerie vers du temps réel si le besoin se confirmait ?

**Réponse recommandée** : Remplacer le polling à 20 secondes de `useUnreadMessagesCount` par un canal push — WebSocket via Spring (STOMP sur WebSocket, supporté nativement par Spring) ou Server-Sent Events pour un flux unidirectionnel serveur → client, suffisant pour un simple badge de notification sans nécessiter une bidirectionnalité complète. Le vrai changement d'architecture serait côté backend : introduire une notion de session de connexion active par utilisateur, ce qui reste compatible avec le principe stateless pour l'authentification (le WebSocket s'authentifierait toujours via le même JWT au moment du handshake).

**Point technique à retenir** : ce changement toucherait uniquement la couche de notification en temps réel — il ne remettrait pas en cause l'architecture REST existante pour le reste de l'API, qui resterait inchangée.

**Question piège / relance possible** : Combien de temps estimeriez-vous ce changement ? — Difficile à chiffrer précisément sans prototypage, mais le changement backend (config STOMP, canal par utilisateur) serait probablement plus long que le changement frontend (remplacer un `setInterval` par un abonnement), notamment à cause de la gestion de la reconnexion et de la bascule propre entre plusieurs onglets ouverts pour le même utilisateur.

---

**Question du jury** : Recommanderiez-vous ce projet, en l'état, pour un déploiement réel à l'école demain matin ?

**Réponse recommandée** : Pas sans corriger d'abord les deux points de sécurité documentés (IDOR sur `AssignmentService`, secret TOTP en clair) et sans finaliser une vraie procédure de déploiement (aujourd'hui inexistante). Fonctionnellement, le cœur du produit (cursus, quiz, progression, certification, stage) est solide et couvre le besoin réel identifié — mais je ne recommanderais pas un déploiement en production avec des données réelles d'apprenants avant d'avoir fermé ces lacunes précises, par respect pour les utilisateurs réels qui seraient affectés.

**Point technique à retenir** : la distinction entre « fonctionnellement prêt » et « prêt pour la production avec des utilisateurs réels » est le point le plus important de cette réponse — les deux ne sont pas la même chose, et le confondre serait la pire erreur à faire devant le jury.

**Question piège / relance possible** : Si l'école insistait pour un déploiement immédiat malgré ces lacunes, que feriez-vous ? — Je négocierais au minimum la correction de l'IDOR avant tout déploiement avec de vraies données d'apprenants (c'est celle qui a l'impact direct le plus grave sur des utilisateurs réels), et j'accepterais de repousser le chiffrement du secret TOTP et le CI/CD à une itération très rapprochée plutôt qu'à un horizon indéfini — je ne bloquerais pas indéfiniment un besoin réel de l'école pour une perfection technique totale, mais je ne céderais pas non plus sur la faille de sécurité la plus concrète.

---
