# 9. Scénario de démonstration — soutenance

> Guide détaillé pour une démonstration live d'IAT Academy couvrant
> **tous les rôles et toutes les situations possibles** : progression
> partielle, année 1 entièrement validée (badge), stage en cours et stage
> complet, correction manuelle en direct, certificat vérifiable, badges
> partagés, bourse à l'emploi, messagerie, administration. Tous les
> comptes cités existent réellement et ont été **vérifiés en conditions
> réelles** (connexion, badges, cascade de correction) le 2026-09-12 —
> pas une trame théorique. Chaque étape indique le compte à utiliser,
> l'écran/la route exacte à ouvrir, ce qu'il faut dire, ce qu'il faut
> montrer précisément, et un plan de secours.

---

## 0. Comptes de démonstration (état réel, vérifié)

| Compte | Rôle | Mot de passe | État pré-rempli |
|---|---|---|---|
| `apprenant@iat-academy.local` | Étudiant (Yasmine Bakkali) | `Apprenant@123` | Module 1 validé (**badge Premier module** 🎓), module 2 en cours, dossier de stage entamé (convention école déjà déposée par la direction — volontairement incomplet côté apprenant pour être illustré en direct), conversation pré-remplie avec le formateur |
| `amina.benali@demo.local` | Étudiant (Amina Benali) | `Demo@1234` | Modules 1 à 3 validés, **module 4 avec une vraie copie en attente de correction manuelle** (question ouverte déjà soumise), badges **Premier module** + **Profil complété** |
| `youssef.idrissi@demo.local` | Étudiant (Youssef Idrissi) | `Demo@1234` | Débutant — une seule leçon terminée, aucun badge |
| `lina.cherkaoui@demo.local` | Étudiant (Lina Cherkaoui) | `Demo@1234` | Zéro progression — état « premier jour » |
| `salma.naji@demo.local` | Étudiant (Salma Naji) | `Demo@1234` | **Année 1 entièrement validée (badge « Année 1 validée » 🛫)**, UF 5 (stage) validée par le Directeur, accès Année 2 ouvert |
| `karim.ouafi@demo.local` | Étudiant (Karim Ouafi) | `Demo@1234` | Paiement/activation en attente — **ne peut pas se connecter** (compte désactivé), visible côté admin uniquement |
| `khadija.mansouri@demo.local` | Étudiant (Khadija Mansouri) | `Demo@1234` | Cursus complet — badges **Année 1**, **Année 2** et **Stage validé**, dossier de stage à 5 documents, soutenance validée, **certificat émis** — seule alumni du jeu de démo, seule à voir la bourse à l'emploi |
| `formateur@iat-academy.local` | Formateur (Sara Formateur) | `Formateur@123` | Crée/corrige le contenu, notation, messagerie, sessions live |
| `admin@iat-academy.local` | Admin / Directeur pédagogique (Karim Bensouda) | `Admin@123` | Validations sensibles (UF 5 stage, soutenance), gestion groupes/emplois/utilisateurs |
| `superadmin@iat-academy.local` | Super Admin (Yasmine Aloui) | `SuperAdmin@123` | Tous les droits Admin + paramètres système globaux |
| `support@demo.local` | Support (Sami Radi) | `Demo@1234` | Lecture seule statistiques, messages de contact/newsletter, joignable en direct par les apprenants |

**Autres données de démo :**
- 2 groupes : « Cohorte 2026-A » (membres + 2 sessions live Google Meet/Zoom programmées), « Cohorte 2027-A » (vide, en attente).
- 1 devoir avec 1 copie non corrigée (Yasmine) + 1 copie déjà notée 17/20 (Amina).
- 4 offres d'emploi publiées + 1 brouillon + 1 expirée (réservées aux alumni — Khadija uniquement).
- 18 modules de contenu réel (texte riche HTML — communication, français pro, anglais aviation, posture professionnelle, tourisme, hôtellerie, opérations aéroportuaires, GDS, aérodynamique FR/EN, droit aérien, secourisme, marketing touristique, droit du travail, économie du tourisme, régions du Maroc, préparation au stage, rédaction du rapport de stage).
- 4 quiz de fin de module avec QCM + Vrai/Faux + une **question ouverte (ESSAY)** sur le module 4.

**Point important corrigé le 2026-09-12** : les scénarios précédents ne comportaient aucun badge réel (le seeder écrivait la progression directement en base, sans jamais appeler le service qui les attribue). C'est désormais corrigé — chaque compte listé ci-dessus a été vérifié via l'API réelle (`GET /api/me/badges`) après un redémarrage propre du backend.

---

## 1. Introduction (à dire, pas à démontrer)

> *« Je vous présente IAT Academy, une plateforme e-learning complète pour
> les métiers de l'aviation, de l'accueil et du tourisme. Avant ce projet,
> le suivi pédagogique reposait sur des supports dispersés, sans espace
> numérique unique. J'ai conçu et développé, seul, une solution qui
> structure le cursus complet — cours, quiz, progression, stage,
> certification — tout en respectant les validations humaines
> obligatoires du Directeur pédagogique. »*

---

## 2. Présentation rapide de l'interface

Se connecter en `admin@iat-academy.local` pour montrer en 30 secondes :
- La sidebar staff (`/admin`) : cours, quiz, apprenants, groupes, stage, messagerie, statistiques, utilisateurs, paramètres.
- La distinction des deux « shells » : `(admin)/admin/**` pour le staff, `app/**` pour l'apprenant — même moteur d'authentification, chrome différent selon le rôle.

---

## 3. Scénario A — Parcours apprenant standard (Yasmine)

**Compte :** `apprenant@iat-academy.local` / `Apprenant@123`

1. Connexion → `/app` : tableau de bord avec la progression réelle, le badge **Premier module** déjà visible dans la bande de badges.
2. Ouvrir le module 2 (« Français pro ») → montrer une leçon avec du vrai contenu HTML riche (titres, listes, citations) — pas du texte de remplissage.
3. Ouvrir la messagerie (`/app/messages`) → montrer la conversation pré-remplie avec le formateur (« j'ai une question sur le devoir du module 1 »).

**À dire :** *« Chaque bloc de leçon est un vrai contenu structuré, pas un espace réservé — le contenu du module 1 sert d'ailleurs de page d'accueil du cursus (bienvenue, ce que l'apprenant va valider sur 2 ans). »*

---

## 4. Scénario B — Génération de questions par IA en direct (Formateur)

**Compte :** `formateur@iat-academy.local` / `Formateur@123`

1. Aller sur `/admin/quiz-bank`, ouvrir un quiz existant.
2. Cliquer sur **« Générer avec l'IA »**.
3. Deux issues possibles, **toutes deux valorisables à l'oral** :
   - Une clé Gemini/Grok est configurée (`.env` → `GEMINI_API_KEY`/`GROK_API_KEY`) → de vraies questions apparaissent en quelques secondes, avec leurs options.
   - Aucune clé n'est configurée → le système répond explicitement *« Génération IA indisponible »* plutôt que de planter silencieusement. **C'est en soi une démonstration de robustesse** : montrez le repli Gemini → Grok dans le code (`QuestionGenerationService.generate()`), et expliquez que l'échec est toujours géré proprement.

**Plan de secours :** si aucune clé n'est configurée et que vous voulez montrer un vrai succès, configurez une clé avant la soutenance — sinon assumez le message d'erreur explicite comme preuve de robustesse (voir ci-dessus).

---

## 5. Scénario C — Correction hybride en direct (le moment fort) ⭐

**Comptes :** `amina.benali@demo.local` (pour montrer AVANT) puis `formateur@iat-academy.local` (pour corriger)

1. Connectez-vous en Amina → `/app` : le module 4 (« Posture professionnelle ») affiche un statut **« en attente de correction »** — le quiz a été soumis mais pas encore noté.
2. Reconnectez-vous en `formateur@iat-academy.local` → `/admin/grading`.
3. La copie d'Amina apparaît avec sa vraie réponse rédigée : *« Un passager conteste fermement une consigne de sécurité de l'équipage… »* → sa réponse réelle sur la gestion d'un refus passager.
4. Attribuez une note (ex. **80/100**) et validez.
5. **Cascade observable immédiatement** : le module 4 passe à « complété », deux notifications sont créées côté apprenant (« Module terminé », « Quiz réussi — score 90% »), et le score final combine la note automatique du QCM et la note manuelle de l'essai.
6. Reconnectez-vous en Amina pour montrer la notification et le module désormais validé.

**À dire :** *« C'est exactement la logique de `finalizeIfFullyGraded` : le score final n'est jamais figé tant qu'une question ouverte reste en attente, et la correction manuelle déclenche la même cascade (badges, certificat) qu'une correction entièrement automatique. »*

**Important pour la répétition :** cette tentative est réinitialisée à chaque redémarrage du backend (`app.demo.reset-progress-on-startup=true`) — vous pouvez donc la re-corriger à volonté en redémarrant avant chaque répétition.

---

## 6. Scénario D — Année 1 entièrement validée (Salma) 🛫

**Compte :** `salma.naji@demo.local` / `Demo@1234`

1. Connexion → `/app` : la bande de badges affiche **« Année 1 validée »** (icône avion qui décolle), en plus de « Premier module ».
2. Cliquer sur l'icône de partage du badge → ouvre `/achievements/[code]` : la page publique avec l'image « carte d'embarquement » générée dynamiquement en Java2D, et le bouton de partage LinkedIn/réseaux.
3. Montrer que son accès à l'Année 2 est ouvert (`year2AccessEnabled`), mais qu'elle n'a pas encore le badge « Année 2 validée » — la distinction entre *avoir accès* et *avoir validé* est explicite.

**À dire :** *« Ce badge n'est jamais attribué manuellement dans l'interface — il est déclenché automatiquement par `ProgressionService` dès que la dernière UF de l'année, y compris la validation manuelle du Directeur sur le stage, est franchie. »*

---

## 7. Scénario E — Workflow de stage complet, avec signature externe (le tuteur) 🧳

Ce scénario montre la validation humaine obligatoire **et** la signature d'un tiers externe sans compte — deux mécanismes distincts à enchaîner.

### 7.1 Dossier en cours (apprenant)
**Compte :** `apprenant@iat-academy.local` → `/app/stage`. Montrer la convention école déjà déposée par la direction, et le champ encore vide pour la convention entreprise — l'apprenant peut illustrer un dépôt de document en direct ici.

### 7.2 Invitation du tuteur (staff)
**Compte :** `admin@iat-academy.local` ou `formateur@iat-academy.local` → `/admin/stage`.
1. Sélectionner Yasmine, choisir **UF 5 (Stage)**, saisir un email de tuteur fictif (ex. `tuteur.demo@example.com`) et cliquer **« Inviter le tuteur à signer »**.
2. Le backend crée un `StageSignoffInvite` — un jeton unique, à usage unique, valable 7 jours (`POST /api/stage/signoff-invites`).
3. Récupérer le lien envoyé (visible dans les logs backend en dev, ou directement en base : `SELECT token FROM stage_signoff_invites ORDER BY created_at DESC LIMIT 1;`).

### 7.3 Signature externe (le tuteur, sans compte)
Ouvrir `/tutor-signoff/{token}` dans une fenêtre de navigation privée (pour bien montrer qu'aucune connexion n'est requise) → le tuteur voit le nom de l'apprenant et l'UF concernée, saisit une note optionnelle et signe.

**À dire :** *« Ce lien est un jeton signé à usage unique — pas un compte, pas de mot de passe. Le tuteur n'a jamais besoin de s'inscrire pour une action ponctuelle. »*

### 7.4 Cascade observable
Reconnectez-vous en Yasmine (ou consultez ses badges côté admin) : l'UF 5 est désormais validée, une notification est créée, et si c'était sa dernière UF de l'année, le badge d'année se déclenche automatiquement — exactement le même mécanisme que la validation manuelle par le Directeur (§6), mais déclenché par un tiers externe.

**Plan de secours :** si l'email de test SMTP n'est pas configuré, l'envoi échoue silencieusement côté email mais **le jeton est bien créé en base** — récupérez-le directement via `docker exec iat-postgres psql -U iat -d iat_academy -c "SELECT token FROM stage_signoff_invites ORDER BY created_at DESC LIMIT 1;"` plutôt que de dépendre de la réception d'un email pendant la soutenance.

---

## 8. Scénario F — Certificat vérifiable publiquement + LinkedIn (Khadija)

**Compte :** `khadija.mansouri@demo.local` / `Demo@1234`

1. Connexion → `/app` : badges Année 1 + Année 2 + Stage validé, et un certificat déjà émis.
2. Cliquer sur **« Ajouter au profil LinkedIn »** → montrer le flux officiel `linkedin.com/profile/add?startTask=CERTIFICATION_NAME` (pas un simple partage de lien générique).
3. Ouvrir `/verify/[code]` dans un onglet à part (le code est visible sur son certificat) → page publique, aucune authentification requise, balises Open Graph pour un aperçu correct sur LinkedIn.
4. Se déconnecter et essayer d'ouvrir `/verify/un-faux-code` → montrer le message d'erreur propre (code invalide).

**À dire :** *« N'importe quel recruteur peut vérifier ce certificat sans compte — c'est la différence entre un diplôme papier et une preuve numérique vérifiable. »*

---

## 9. Scénario G — Bourse à l'emploi réservée aux diplômés

1. **Khadija** (alumni, certificat émis) → `/app/jobs` : 4 offres visibles (Royal Air Maroc, RAM Handling, Atlas Voyages, Sofitel Marrakech).
2. **Yasmine** (pas encore diplômée) → `/app/jobs` : message explicite *« Réservé aux diplômés — terminez votre parcours pour y accéder »* plutôt qu'une erreur générique.

**À dire :** *« Le statut diplômé n'est jamais un champ dupliqué — c'est directement `certificateRepository.findByUserIdAndFormationId(...)`, donc il ne peut jamais se désynchroniser de la réalité. »*

---

## 10. Scénario H — Devoirs, notation et cohortes

**Compte :** `formateur@iat-academy.local` → `/admin/gradebook`.
- Copie de Yasmine : encore **non corrigée** (à noter en direct si le temps le permet).
- Copie d'Amina : déjà notée **17/20** avec un commentaire — montrer le retour visible côté apprenant.

Puis `/admin/groups` ou l'espace sessions live : Cohorte 2026-A avec 2 sessions programmées (Google Meet passé, Zoom à venir) — montrer que le formateur voit désormais les salons de cohorte dans sa messagerie (correctif documenté dans `docs/07-securite.md`).

---

## 11. Scénario I — Rôle SUPPORT et messagerie cloisonnée

**Compte :** `support@demo.local` / `Demo@1234`
- Se connecter → montrer l'accès limité : statistiques en lecture seule, messages de contact, abonnés newsletter — **aucun accès** au contenu pédagogique.
- Côté apprenant (`/app/messages`), montrer que l'annuaire « Support » est séparé de celui des formateurs — épinglé pour qu'un apprenant en difficulté le trouve immédiatement.

**Point à assumer si le jury demande :** ce rôle ne peut pas être attribué depuis l'interface admin (`AdminService.changeRole` refuse explicitement toute promotion vers `SUPPORT` — limite MVP documentée dans `docs/11-questions-jury.md`).

---

## 12. Scénario J — Administration et comptes en attente

**Compte :** `admin@iat-academy.local` → `/admin/users`.
- Montrer Karim Ouafi : statut **paiement en attente**, compte non activé — il ne peut pas se connecter tant que l'admin ne l'active pas. Activez-le en direct pour montrer le changement d'état.
- `superadmin@iat-academy.local` → `/admin/settings` : paramètres système globaux, réservés au Super Admin (le seul droit qui dépasse ceux de l'Admin/Directeur).

---

## 13. Minutage indicatif (démonstration live : 6 à 9 minutes)

| Scénario | Durée |
|---|---|
| 2. Présentation interface | 0:30 |
| 3. Parcours apprenant (Yasmine) | 1:00 |
| 4. Génération IA | 0:45 |
| 5. **Correction hybride en direct** | 1:30 |
| 6. Année 1 validée + badge partagé | 1:00 |
| 7. Stage + signature externe | 1:45 |
| 8. Certificat + LinkedIn | 1:00 |
| 9. Bourse à l'emploi | 0:30 |
| 10-12. Devoirs / Support / Admin (si le temps le permet) | 1:00 |

Priorité absolue si le temps manque : **5 (correction hybride)**, **7 (stage + signature externe)**, **6 (année validée)** — ce sont les trois scénarios qui démontrent une cascade métier bout en bout, pas seulement un écran statique.

---

## 14. Prérequis avant la soutenance

1. **Docker** : `docker compose up -d postgres redis` (Postgres sur `5433`, Redis sur `6379`).
2. **Backend** : `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` — vérifier dans les logs la ligne `Demo ready — scénarios: …` qui confirme un seed propre.
3. **Frontend** : `npm run dev`.
4. **Redémarrer le backend juste avant la démo** pour repartir sur un état propre (la tentative PENDING_REVIEW d'Amina et toute correction faite en répétition sont réinitialisées à chaque redémarrage).
5. Si vous comptez démontrer la génération IA avec un vrai résultat (pas le message d'erreur), vérifier que `GEMINI_API_KEY` ou `GROK_API_KEY` est renseignée dans `.env`.
6. Si le rate-limit de connexion a été épuisé par des répétitions (10 tentatives / 15 min par IP), le réinitialiser : `docker exec iat-redis redis-cli DEL "rate:login:<votre IP>"`.
7. Avoir sous la main (imprimé ou sur un second écran) `docs/11-questions-jury.md` pour les questions pièges.

## 15. Checklist « le jour J »

- [ ] Docker + backend + frontend démarrés, `/actuator/health` répond `200`.
- [ ] Se connecter une fois en Yasmine et en admin pour vérifier que les mots de passe fonctionnent (tous corrigés le 2026-09-12).
- [ ] Vérifier que la copie d'Amina est bien en attente (`/admin/grading` doit lister une entrée).
- [ ] Avoir un onglet de navigation privée prêt pour le scénario tuteur externe (§7.3).
- [ ] Garder un œil sur le minutage — s'arrêter à la section en cours plutôt que de se presser sur la suivante.

---

## 16. Ce qui reste à valider en répétition (honnêteté totale)

- L'envoi réel d'email pour l'invitation tuteur n'a pas été testé avec un vrai serveur SMTP — le jeton est garanti créé en base (vérifié), mais la réception d'email dépend de la configuration `.env` du jour.
- Le temps de réponse réel de Gemini/Grok en génération IA n'a pas été mesuré en direct — prévoir une marge dans le minutage.
- L'upload d'un document de stage côté apprenant (taille/format acceptés) n'a pas été testé en conditions réelles pendant cette session de préparation — à vérifier une fois avec un vrai petit PDF avant la soutenance plutôt que le jour même.
