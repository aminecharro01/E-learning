# 10. Fonctionnalités à valeur ajoutée — ce qui dépasse le CRUD

> Sélection, parmi les fonctionnalités déjà citées dans
> `01-presentation-application.md` et détaillées dans `04-backend.md`,
> `07-securite.md` et `08-services-externes.md`, de celles qui peuvent
> réellement différencier ce projet d'une plateforme e-learning CRUD
> classique devant un jury. Chaque fonctionnalité a été revérifiée dans
> le code au moment de la rédaction ; les démonstrations proposées
> renvoient, quand un pas à pas existe déjà, vers `09-scenarios-demonstration.md`.

---

## 1. Génération de questions de quiz par IA, repli Gemini → Grok

**Intérêt / problème résolu.** Un formateur génère des questions à partir
du contenu d'une leçon en un clic au lieu de les rédiger à la main ;
dépendre d'un seul fournisseur d'IA exposerait le produit à une panne ou
un changement tarifaire hors de son contrôle.

**Difficulté technique réelle.** Résilience réseau entre deux
fournisseurs hétérogènes (formats de requête/réponse différents) sans
bloquer l'appelant ; parsing tolérant d'une réponse LLM qui peut
entourer le JSON de Markdown ; ne jamais dupliquer les règles de
validation d'une question générée vs saisie à la main.

**Implémentation** (`QuestionGenerationService.java`) :
```java
if (geminiConfigured) {
    try { return parseQuestions(callGemini(prompt), type); }
    catch (Exception e) { log.warn("Génération Gemini échouée, repli sur Grok"); }
}
if (grokConfigured) { try { return parseQuestions(callGrok(prompt), type); } ... }
```
Le service ne persiste rien : il renvoie des `CreateQuestionRequest`
que `QuizService` valide et enregistre par le chemin normal. Un
fournisseur est « configuré » dès que sa clé API est non vide
(`AiProviderProperties`), sans flag séparé. `callGemini`/`callGrok` sont
package-private pour que `QuestionGenerationServiceTest` les
`Mockito.spy()` sans jamais contacter Google/xAI en CI. Plafonné à
20 générations/5 min/utilisateur (`RateLimitService#checkAiGenerationAllowed`).

**Valeur.** Intégration IA pensée pour la production (repli, coût
maîtrisé, testabilité), pas un simple appel de démo.

**Démonstration (30-60 s).** Déjà scénarisée : `09-scenarios-demonstration.md`
§3.3 (formateur, `/admin/quiz-bank`, génération d'une question `ESSAY`
enchaînée sur la correction manuelle à l'étape suivante).

---

## 2. Correction hybride de quiz (auto + manuelle), réconciliation d'état

**Intérêt / problème résolu.** Un même quiz mélange QCM auto-corrigés et
questions ouvertes (`ESSAY`) à corriger à la main ; entre la soumission
et la fin de la correction manuelle, une tentative reste dans un état
ambigu, et les effets de bord d'une réussite (badge, certificat,
notification) ne doivent se déclencher qu'une fois tout corrigé, jamais
deux fois.

**Difficulté technique réelle.** Savoir quand une tentative passe de
`PENDING_REVIEW` à un état final, recalculer un score pondéré sur des
échelles différentes (QCM en points, essai en pourcentage), et ne pas
dupliquer les effets de bord entre soumission directe et finalisation
différée.

**Implémentation** (`QuizGradingService#finalizeIfFullyGraded`) :
```java
// n'agit que si toutes les questions ESSAY sont notées (allGraded == true)
attempt.setStatus(passed ? AttemptStatus.PASSED : AttemptStatus.FAILED);
quizAttemptService.applyPassEffects(attempt, quiz, userId, wasModuleCompleted, passed, finalScore);
```
`applyPassEffects` est **partagée** entre soumission directe
(`QuizAttemptService#submit`) et finalisation différée
(`QuizGradingService`) : un seul point de vérité pour « que se passe-t-il
quand un quiz est réussi ».

**Valeur.** Maîtrise de la cohérence d'état transactionnelle quand deux
acteurs (moteur automatique, correcteur humain) écrivent le même agrégat.

**Démonstration (30-60 s).** Déjà scénarisée : `09-scenarios-demonstration.md`
§3.4 (soumission d'un quiz mixte, statut « en attente ») puis §3.5
(notation de la question ouverte côté Formateur, bascule vers le score
final).

---

## 3. Progression pédagogique en cascade, validation humaine obligatoire

**Intérêt / problème résolu.** Le déblocage séquentiel combine une règle
automatique (quiz réussi, contenu visionné) et, pour deux UF sensibles
(stage, soutenance), une validation humaine du directeur qu'aucun
critère automatique ne remplace — empêcher techniquement, pas juste
visuellement, l'accès à du contenu avancé sans prérequis.

**Difficulté technique réelle.** Combiner trois conditions indépendantes
pour une UF sans les recalculer, et propager le calcul en cascade
module → UF → année (`ProgressionService`, 369 lignes) :
```java
if (!contentDone) return false;
if (!isUfQuizPassed(userId, ufCode)) return false;
return ufValidationService.isValidated(userId, ufCode);
```
`isValidated` court-circuite à `true` pour toute UF hors de
`DIRECTOR_GATED_UFS` (`"UF 5"`, `"UF 11"`) — la validation humaine ne
s'ajoute qu'où le métier l'exige. Le service gère aussi deux parcours
d'accès distincts (groupe présentiel vs 100 % en ligne) dans une seule
méthode, et `checkAndAwardYearBadges` est documentée idempotente via
`BadgeService#awardIfAbsent`.

**Valeur.** La fonctionnalité la plus représentative du cœur métier réel
d'IAT Academy : « contenu terminé » et « validé par l'institution » sont
deux choses distinctes, un cas où l'automatisation complète doit être
refusée.

**Démonstration (30-60 s).** Déjà scénarisée : `09-scenarios-demonstration.md`
§3.6 (dépôt d'un document de stage côté apprenant, puis validation de
l'« UF 5 » côté Admin, déblocage immédiat et badge `STAGE_VALIDATED`).

---

## 4. Certificat vérifiable publiquement et partage LinkedIn officiel

**Intérêt / problème résolu.** Un certificat papier n'est vérifiable par
personne d'autre que l'établissement ; ici, un code de vérification
public, intégré au **vrai** flux « Ajouter au profil » de LinkedIn
(utilisé par Coursera, pas un simple lien de partage de post), permet à
n'importe qui de confirmer l'authenticité sans compte — le PDF original
restant hors de portée du téléchargement direct par l'apprenant.

**Difficulté technique réelle.** LinkedIn distingue un partage de post
d'une entrée durable en section « Licences et certifications »
(`profile/add?startTask=CERTIFICATION_NAME`), qui exige des paramètres
précis (`certUrl`, `certId`, `issueYear`, `issueMonth`) construits à
partir de données vérifiées côté serveur.

**Implémentation** (`verify/[code]/page.tsx`, Server Component) :
```tsx
const linkedInAddToProfileUrl = `https://www.linkedin.com/profile/add?${new URLSearchParams({
  startTask: "CERTIFICATION_NAME", name: cert.formationTitle, certUrl: url, certId: cert.verificationCode,
}).toString()}`;
```
`CertificateController#verify` est public (`SecurityConfig.publicPaths`),
séparé du téléchargement du PDF réservé à `ADMIN`.

**Valeur.** Preuve numérique vérifiable par un tiers, argument
différenciant pour une académie professionnelle ; intégration LinkedIn
correcte (pas un bouton « partager » générique).

**Démonstration (30-60 s).** Déjà scénarisée : `09-scenarios-demonstration.md`
§3.7 (compte alumni `khadija.mansouri@demo.local`, page `/verify/<code>`
en navigation privée puis bouton « Ajouter au profil LinkedIn »).

---

## 5. Badge de palier — image « carte d'embarquement » en Java2D

**Intérêt / problème résolu.** Un badge partagé a besoin d'un aperçu
visuel cohérent avec la marque ; chaque badge génère donc une image
1200×630 (Open Graph) en Java2D pur — dégradé navy, souche façon billet
d'avion, code-barres pseudo-aléatoire, glyphe par type de badge — sans
dépendre d'un service tiers payant de rendu d'image.

**Difficulté technique réelle.** Composer un visuel de marque avec l'API
bas niveau `Graphics2D` implique de gérer soi-même ce qu'un moteur de
templating ferait normalement — voir `drawWrapped()` (retour à la ligne
d'un titre trop long) et `drawCentered()` dans `BadgeImageService.java`.
Le code-barres est généré de façon reproductible à partir du hash du
code de partage (`new Random(shareCode.hashCode())`), et l'image mise en
cache disque après la première génération (`getOrGenerateImage`).

**Valeur.** Compétence rare (API Java2D bas niveau) et cohérence de
marque bout en bout (reprend les couleurs/motifs du tableau de bord
frontend).

**Démonstration (30-60 s).** Déjà scénarisée : `09-scenarios-demonstration.md`
§3.7, volet badge (`/app/profile` → `/achievements/<code>`, ou
directement `/api/badges/verify/{code}/image.png` sans session).

---

## 6. Contrôle d'accès à granularité fine, au-delà du RBAC déclaratif

**Intérêt / problème résolu.** `@PreAuthorize` prouve un rôle, jamais un
droit sur une ressource précise — le projet ajoute donc une vérification
de propriété au niveau service pour empêcher la classe **IDOR** : un
apprenant qui changerait un UUID dans l'URL ne doit jamais lire les
données d'un autre.

**Difficulté technique réelle.** La règle dépend de la relation entre
l'utilisateur authentifié et la ressource chargée depuis la base, et
cette relation change de forme selon le type de ressource :
```java
// MessagingService#assertAccess — salon de cohorte : staff toujours, apprenant si même groupe
// conversation directe : appartenance stricte via participantRepository
```
`LessonNoteService#requireOwnNote` va plus loin : même le staff n'a pas
accès aux notes d'un apprenant. `StageService.assertCanView()`/
`assertCanUpload()` combine rôle et propriété différemment par type de
document (staff voit tout, un élève seulement le sien).

**Limite honnête (documentée dans `07-securite.md`).**
`AssignmentService.gradeSubmission()`/`.delete()` ne vérifient que le
rôle, jamais la propriété du module — un formateur peut noter/supprimer
un devoir d'un module qu'il n'encadre pas. IDOR réelle, assumée, non
corrigée.

**Valeur.** Comprendre qu'un RBAC seul ne protège jamais des données
utilisateur — distinction que beaucoup de projets étudiants ignorent, et
capacité à nommer honnêtement la limite plutôt que de la cacher.

**Démonstration (30-60 s).** Pas de pas à pas dédié dans
`09-scenarios-demonstration.md` — plus parlant en lecture de code
qu'en live : montrer `assertAccess`/`requireOwnNote`, puis énoncer
directement la limite `AssignmentService`.

---

## 7. Recherche globale avec confidentialité selon le rôle

**Intérêt / problème résolu.** Une seule barre de recherche interroge
modules, leçons, contenu texte, PDF **et** banque de questions ; sans
filtrage, une recherche transverse naïve deviendrait un moyen détourné
de consulter les réponses d'un quiz avant de le passer — ce dernier type
de résultat n'est donc jamais renvoyé à un apprenant.

**Difficulté technique réelle.** La confidentialité doit changer le
**contenu de la réponse** selon le rôle, sur le même endpoint :
```java
// includeQuestions vient du rôle, décidé par SearchController — jamais par le client
if (includeQuestions) {
    for (Question q : questionRepository.searchByPromptContainingIgnoreCase(query, pageable)) { ... }
}
```
`SearchController` détermine `includeQuestions` à partir du rôle avant
l'appel de service, qui reste la dernière ligne de défense.

**Valeur.** Exemple court de « sécurité par conception » : la
confidentialité fait partie de la signature de méthode, pas d'un filtre
ajouté après coup côté frontend.

**Démonstration (30-60 s).** Pas de pas à pas dédié dans
`09-scenarios-demonstration.md` — à improviser si le temps le permet :
lancer la même recherche (mot présent dans une question) depuis un
compte apprenant puis Formateur.

---

## 8. Bourse à l'emploi dérivée du statut certificat

**Intérêt / problème résolu.** Le statut « diplômé » n'est stocké nulle
part comme champ booléen sur `User` — il est recalculé à partir de
l'existence d'un `Certificate`, évitant deux sources de vérité qui
divergeraient (un champ `isAlumni` oublié le jour où un certificat est
révoqué/réémis).

**Difficulté technique réelle.** Résister à la tentation d'un champ
dupliqué « pour la performance » quand une seule table fait déjà foi :
```java
boolean isAlumni = certificateRepository.findByUserIdAndFormationId(userId, DEFAULT_FORMATION_ID).isPresent();
if (!isAlumni) throw new ForbiddenException("Réservé aux diplômés.");
```

**Valeur.** Exemple simple et parlant de normalisation de données
appliquée à une règle métier réelle.

**Démonstration (30-60 s).** S'appuie sur le jeu de démo de
`09-scenarios-demonstration.md` : seule `khadija.mansouri@demo.local`
(seul compte alumni) voit la bourse à l'emploi ; comparer avec un autre
compte apprenant (403 ou menu absent) sans jamais modifier un champ de
profil entre les deux.

---

## Classement pour la soutenance

### 🔥 Fonctionnalités à absolument montrer

1. **Génération de questions de quiz par IA avec repli Gemini → Grok** —
   démonstration la plus visuellement convaincante d'une intégration IA
   pensée pour la production.
2. **Correction hybride de quiz (auto + manuelle) avec réconciliation
   d'état** — meilleure preuve de maîtrise de la cohérence d'état
   transactionnelle.
3. **Progression pédagogique en cascade avec validation humaine
   obligatoire** — la plus représentative du cœur métier réel.
4. **Certificat vérifiable publiquement + partage LinkedIn officiel** —
   impact concret pour un employeur/jury, intégration tierce soignée.

### ⭐ Fonctionnalités à montrer si le temps le permet

5. **Badge « carte d'embarquement » en Java2D** — impressionnant
   visuellement, secondaire au cœur métier.
6. **Contrôle d'accès à granularité fine (au-delà du RBAC)** — plus
   parlant en lecture de code qu'en démonstration live.
7. **Recherche globale avec confidentialité selon le rôle** —
   démonstration rapide, fonctionnalité secondaire.
8. **Bourse à l'emploi dérivée du statut certificat** — bon exemple de
   modélisation de données, impact produit modeste.

### 💡 Fonctionnalités techniques à mentionner

- **Limitation de débit Redis transverse** (`RateLimitService`, 8 cas
  d'usage réels : login, inscription, réinitialisation de mot de passe,
  renvoi de vérification, messages, assistant IA, génération IA, upload).
- **2FA TOTP codée à la main** (`TotpService.java`) — RFC 6238,
  `HmacSHA1`, période 30 s, 6 chiffres, sans bibliothèque tierce dédiée.
- **Signature électronique de stage par un tuteur externe sans compte**
  (`StageSignoffInvite`) — jeton non devinable (deux UUID v4 concaténés),
  expirant à 7 jours (`INVITE_TTL`), invalidé dès signature (`usedAt`).
- **Verrou consultatif PostgreSQL scopé à la transaction**
  (`pg_advisory_xact_lock`, `QuizAttemptRepository#acquireStartLock`)
  contre les tentatives de quiz dupliquées en cas de double-clic —
  problème reproduit par un script de charge dédié
  (`loadtest/quiz-start-concurrency.js`).
- **Assistant de cours IA filtré par la progression pédagogique**
  (`CourseAssistantService`) — RAG « pauvre » par mots-clés, sans
  embeddings ni base vectorielle, qui exclut tout bloc dont le module
  n'est pas encore débloqué pour l'apprenant (`ProgressionService`).
- 45 migrations Flyway versionnées, jamais modifiées après fusion ;
  conteneurisation Docker Compose (Postgres + Redis) reproductible ;
  suite de tests automatisés (JUnit5/Mockito côté backend, Vitest/RTL et
  Playwright côté frontend).
