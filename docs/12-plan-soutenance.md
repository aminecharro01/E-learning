# Plan de soutenance — IAT Academy

> Plan final et minuté, basé sur les dix fichiers déjà rédigés dans `docs/`
> (`01-presentation-application.md` à `11-questions-jury.md`). Aucun chiffre
> n'est réinventé : tous proviennent du tableau « Chiffres clés » (§0 de
> `04-backend.md`).
>
> **Cible : 15–20 min de présentation + 10 min de questions.** Minutage
> ci-dessous : **19 min** de présentation + **10 min** de questions = **~29
> min** au total (détail en fin de document).

## Tableau récapitulatif

| # | Section | Temps | Fichier(s) source(s) |
|---|---|---|---|
| 1 | Introduction | 1 min | `01-presentation-application.md` (§1, §3) |
| 2 | Problématique | 1 min | `01-presentation-application.md` (§1) |
| 3 | Objectifs | 1 min | `01-presentation-application.md` (§2) |
| 4 | Présentation de la solution | 1 min 30 | `01-presentation-application.md` (§3–§6) |
| 5 | Architecture | 1 min 30 | `02-architecture-et-diagrammes.md` (§1), `04-backend.md` (§0), `06-infrastructure.md` (§6.1–6.4) |
| 6 | Technologies utilisées | 1 min | `01-presentation-application.md` (§11), `03-frontend.md` (§3.13) |
| 7 | Fonctionnement général | 1 min | `01-presentation-application.md` (§8–§10) |
| 8 | Démonstration | 6 min | `09-scenarios-demonstration.md` |
| 9 | Fonctionnalités à forte valeur ajoutée | 2 min 30 | `10-fonctionnalites-valeur-ajoutee.md` |
| 10 | Sécurité | 1 min | `07-securite.md` (Récapitulatif) |
| 11 | Difficultés et solutions | 1 min | `02-architecture-et-diagrammes.md` (§6), `05-base-de-donnees.md` (Q2, Q9, Q12), `04-backend.md` (Q3, Q6) |
| 12 | Limites | 1 min | `06-infrastructure.md` (§6.9–6.11), `07-securite.md` (Récapitulatif), `10-fonctionnalites-valeur-ajoutee.md` |
| 13 | Perspectives | 30 s | `06-infrastructure.md` (§6.10), `03-frontend.md` (Q12), `07-securite.md` (Q4) |
| 14 | Conclusion | 30 s | `01-presentation-application.md` (§2), `10-fonctionnalites-valeur-ajoutee.md` |
| 15 | Questions du jury | 10 min | `11-questions-jury.md` + « Questions possibles du jury » de `03` à `08` |
| | **Total présentation (1–14)** | **19 min** | |
| | **Total avec questions (1–15)** | **~29 min** | |

## 1. Introduction — 1 min
*(`01-presentation-application.md` §1, §3)*

**Oral :** « IAT Academy — une plateforme e-learning pour la formation aviation/tourisme »
- Contexte du PFE et de l'établissement partenaire (académie marocaine aviation/accueil/tourisme, cursus présentiel + stage).
- Annoncer le plan en une phrase (problématique → solution → démo → valeur ajoutée → sécurité → limites/perspectives → conclusion).
- Citer les cinq rôles (`SUPER_ADMIN`, `ADMIN`, `FORMATEUR`, `ETUDIANT`, `SUPPORT`) sans détailler.

## 2. Problématique — 1 min
*(`01-presentation-application.md` §1)*

**Oral :** « Le problème métier avant la plateforme »
- Aucun espace numérique commun : pas de vue d'ensemble de la progression, évaluation non centralisée, pas de contrôle d'accès séquentiel.
- Certaines étapes (stage, soutenance finale) exigent le jugement explicite d'un directeur pédagogique — pas qu'un problème technique.
- Certification jusque-là manuelle, sans preuve vérifiable par un tiers.

## 3. Objectifs — 1 min
*(`01-presentation-application.md` §2)*

**Oral :** « Objectifs du projet »
- Trois axes : représenter fidèlement structure pédagogique/évaluation, garantir le déblocage séquentiel vérifié côté serveur, outiller le staff et automatiser certification/stage/sécurité.
- Insister sur « vérifié côté serveur » : fil conducteur vers la section Sécurité.

## 4. Présentation de la solution — 1 min 30
*(`01-presentation-application.md` §3–§6)*

**Oral :** « IAT Academy en pratique : rôles, fonctionnalités, parcours »
- Cinq rôles, en insistant sur `SUPPORT` (compte interne non-staff, `Role.isStaff()` = faux) et les acteurs externes sans compte (tuteur de stage via lien à usage unique).
- Domaines fonctionnels : catalogue, quiz, devoirs, progression, stage, certification, badges, messagerie, bourse à l'emploi, admin, assistant IA ; secondaires en une phrase (agenda, notes privées, décrochage).
- Les deux shells (`app/**` apprenant, `(admin)/admin/**` staff), fil conducteur visuel repris en démo.

## 5. Architecture — 1 min 30
*(`02-architecture-et-diagrammes.md` §1, `04-backend.md` §0, `06-infrastructure.md` §6.1–6.4)*

**Oral :** « Architecture technique »
- Trois niveaux : Next.js 15 → API REST Spring Boot 3.4.5 (Controller → Service → Repository → Entity) → PostgreSQL 16 (Flyway) + Redis 7.
- Chiffres à citer de mémoire : **31 contrôleurs, 46 services, 38 repositories, 39 entités JPA, 45 migrations Flyway**.
- Transparence proactive : Nginx écrit mais **pas encore activé** ; seuls `postgres`/`redis` tournent en conteneur, API et frontend hors conteneurs en dev — le dire avant qu'on le demande.

## 6. Technologies utilisées — 1 min
*(`01-presentation-application.md` §11, `03-frontend.md` §3.13)*

**Oral :** « Choix technologiques et justifications »
- Backend : Spring Boot 3.4.5 / Java 21+, PostgreSQL 16 + Flyway, Redis 7, JWT en cookie `httpOnly`.
- Frontend : Next.js 15 (Turbopack), TypeScript strict, Tailwind v4, Axios, react-hook-form + Zod, Vitest + Playwright.
- Garder 5–6 justifications prêtes : Axios pour les intercepteurs, Context API plutôt que Redux (état global modeste).

## 7. Fonctionnement général — 1 min
*(`01-presentation-application.md` §8–§10)*

**Oral :** « De la requête à la base de données »
- Parcours apprenant type : connexion → dashboard → module → quiz → badge → stage → certificat — transition vers la démo.
- Frontend ↔ backend ↔ base : client Axios centralisé, cookie JWT à chaque requête, backend `STATELESS`, RBAC déclaratif + vérifications de propriété en service.
- 39 entités JPA sur une dizaine de domaines fonctionnels.

## 8. Démonstration — 6 min
*(`09-scenarios-demonstration.md`, script complet)*

**Oral :** « Démonstration live »
- Connexion apprenant → module (déblocage séquentiel visible) → génération de question IA côté formateur → quiz avec question ouverte en attente → correction hybride (§3.1–3.5, séquence la plus dense en preuve technique).
- Dossier de stage + validation d'UF sensible → certificat vérifiable publiquement + badge partagé LinkedIn (§3.6–3.7).
- Statistiques staff puis, si le temps le permet, messagerie + assistant IA (§3.8–3.9, optionnel).
- Comptes de démo exclusivement ceux du tableau « Comptes de démonstration réels » (cas contrastés) ; plan B (captures d'écran) prêt en cas de panne réseau ou d'IA externe indisponible.

Fourchette source : 5–8 min ; sacrifier §3.9 en premier si besoin de temps.

## 9. Fonctionnalités à forte valeur ajoutée — 2 min 30
*(`10-fonctionnalites-valeur-ajoutee.md` §1–4, « Classement pour la soutenance »)*

**Oral :** « Ce qui dépasse le CRUD attendu » — reprendre le classement « à absolument montrer », dans cet ordre :
- **Génération de questions par IA, repli Gemini → Grok** : `QuestionGenerationService` retente sur un second fournisseur, limité par `RateLimitService`, réutilise le chemin de validation existant.
- **Correction hybride de quiz (auto + manuelle)** : meilleure preuve de cohérence transactionnelle.
- **Progression pédagogique en cascade, validation humaine obligatoire** : la plus représentative du cœur métier — un score seul ne suffit pas.
- **Certificat vérifiable publiquement + partage LinkedIn** : impact concret jury/employeur, transition vers la sécurité (PDF protégé malgré vérification publique).
- Mentionner en une phrase si le temps le permet : badge Java2D, contrôle d'accès à granularité fine (au-delà du RBAC).

Section la plus dense après la démo : ne pas la comprimer.

## 10. Sécurité — 1 min
*(`07-securite.md` §1–§3, Récapitulatif)*

**Oral :** « Sécurité transversale »
- JWT en cookie `httpOnly` + 2FA TOTP maison (RFC 6238).
- RBAC déclaratif (`@PreAuthorize`, hiérarchie `ROLE_SUPER_ADMIN > ROLE_ADMIN`) + vérifications de propriété en service (anti-IDOR).
- Annoncer soi-même ce qui est volontairement absent : pas de CSRF dédié (mitigé `SameSite=Lax` + CORS), pas de révocation de token serveur, rate limiting sur 8 cas d'usage mais pas global.
- Bean Validation systématique, requêtes paramétrées, BCrypt.

## 11. Difficultés et solutions — 1 min
*(`02-architecture-et-diagrammes.md` §6, `05-base-de-donnees.md` Q2/Q9/Q12, `04-backend.md` Q3/Q6)*

**Oral :** « Difficultés rencontrées » — choisir 2–3 exemples concrets et vérifiables :
- **Déblocage séquentiel fiable** : le gate de validation d'UF devait s'insérer sans court-circuiter la logique de complétion de module — objectivé par vérification croisée diagramme/code.
- **Ne jamais réécrire une migration Flyway déployée** : marche arrière sur une fonctionnalité sans réécrire l'historique.
- **`LazyInitializationException`** avec `open-in-view: false` : initialiser explicitement les associations utiles avant sortie du service (`BadgeService#getByShareCode`).

## 12. Limites — 1 min
*(`06-infrastructure.md` §6.9–6.11, `07-securite.md` Récapitulatif/Q4, `10-fonctionnalites-valeur-ajoutee.md`)*

**Oral :** « Limites actuelles, assumées » — reprendre telles quelles les limites déjà documentées :
- Infrastructure de prod non finalisée : Nginx écrit non activé, pas de CI/CD, pas de monitoring au-delà de `/actuator/health`.
- Sécurité : pas de CSRF dédié, pas de révocation de token, rate limiting non global.
- Rôle `SUPPORT` non promouvable en MVP : contrôles présents en code, mais `AdminService.changeRole()` refuse cette promotion — limite volontaire.

## 13. Perspectives — 30 s
*(`06-infrastructure.md` §6.10, `03-frontend.md` Q12, `07-securite.md` Q4)*

**Oral :** « Évolutions envisagées »
- CI/CD automatisant les tests/lint déjà utilisés manuellement ; conteneurisation complète (Nginx + API + frontend).
- WebSocket/SSE si le polling `useUnreadMessagesCount` devient coûteux.
- CSRF dédié, révocation de token, levée de la limite MVP sur `SUPPORT` si le besoin se confirme.

## 14. Conclusion — 30 s
*(`01-presentation-application.md` §2, `10-fonctionnalites-valeur-ajoutee.md`)*

**Oral :** « Conclusion »
- Reboucler sur les objectifs du §2 : chacun a une réponse vérifiable dans le code.
- Rappeler en une phrase les fonctionnalités à valeur ajoutée du §9 comme preuve de dépassement du CRUD attendu.
- Terminer sur une ouverture vers les perspectives (§13), pas sur les limites.

## 15. Questions du jury — 10 min
*(`11-questions-jury.md` (toutes sections) + « Questions possibles du jury » de `03` à `08`)*

**Oral :** pas de slide dédié — transition : « Je reste à votre disposition pour vos questions ».
- Préparation principale : `11-questions-jury.md`, banque par thème (A. Compréhension générale, B. Architecture, C. Frontend, D. Backend, E. Base de données, F. Sécurité, G. Infrastructure, H. Choix technologiques, I. Tests, J. Difficultés et limites, K. Performance, L. Améliorations futures), chaque question avec réponse recommandée, point technique à retenir et souvent une relance piège.
- En complément, les sections « Questions possibles du jury » en fin de `03` à `08` couvrent des points techniques plus ponctuels, non dupliqués.
- Ne jamais improviser un chiffre : tous ceux cités ici et dans `01`–`10` viennent de comptages directs sur le dépôt (§0 de `04-backend.md`).
- Cibler la relecture selon le jury pressenti (ex. membre exigeant sur la sécurité ou la BDD → relire en priorité F et E de `11-questions-jury.md`).

---

## Vérification de cohérence du minutage

| Bloc | Sous-total |
|---|---|
| Sections 1–7 (intro → fonctionnement général) | 8 min |
| Section 8 (démonstration) | 6 min |
| Section 9 (valeur ajoutée) | 2 min 30 |
| Sections 10–14 (sécurité → conclusion) | 4 min |
| **Total présentation** | **19 min** (dans la fourchette 15–20 min) |
| Section 15 (questions) | 10 min |
| **Total soutenance** | **~29 min** |

Marge si le temps presse : raccourcir d'abord la section 8 (sauter §3.9 optionnel, gain ~1 min) puis la section 4 (gain ~30 s). Ne jamais raccourcir la section 9 — principal argument de différenciation face au jury.

## Checklist — Avant la soutenance

- [ ] Tester la démo complète la veille, conditions réelles, en suivant `09-scenarios-demonstration.md` du début à la fin sans s'arrêter.
- [ ] Vérifier que Docker démarre (`docker compose up -d`), relancer backend (`spring-boot:run`, profil `dev`) et frontend (`npm run dev`), confirmer qu'aucun port (3000/8080/5433) n'est déjà occupé.
- [ ] Vérifier `GEMINI_API_KEY`/`GROK_API_KEY` et préparer le **plan B si l'IA externe est indisponible** : capture d'un exemple déjà généré, question ouverte créée manuellement à l'avance, explication verbale du repli Gemini → Grok prête sans dépendre du réseau live.
- [ ] Préparer un badge réellement gagné via l'interface (pas seedé) et noter son `shareCode` ; vérifier `app.demo.reset-progress-on-startup` pour ne pas perdre cette préparation avant la soutenance.
- [ ] Préparer un plan B général (captures d'écran des étapes critiques) en cas de panne réseau/serveur pendant la démo live.
- [ ] Revoir les questions pièges de `11-questions-jury.md` et les sections « Questions possibles du jury » de `03` à `08` — la veille, pas le matin même.
- [ ] Vérifier le matériel de projection (adaptateur, résolution, contraste clair/sombre) et avoir une copie de secours des slides sur clé USB.
- [ ] Vérifier que les comptes de démo (`09-scenarios-demonstration.md`) sont bien ceux utilisés (pas d'ancien mot de passe changé entre-temps).
- [ ] Relire le tableau « Récapitulatif — présent vs absent » de `07-securite.md`.
- [ ] Chronométrer une répétition complète (présentation seule) pour confirmer la fourchette 15–20 minutes.

## Checklist — Le jour J

- [ ] Arriver tôt pour démarrer Postgres/Redis, backend, frontend avant l'heure de passage, et vérifier une connexion sur chaque compte de démo.
- [ ] Garder un terminal ouvert pour relancer un service qui plante (commandes de secours dans `09-scenarios-demonstration.md`).
- [ ] Fermer toute application/onglet pouvant occuper les ports 3000/8080/5433 ou distraire pendant le partage d'écran.
- [ ] Avoir `docs/01` à `docs/11` accessibles hors-ligne en cas de question précise nécessitant de pointer un fichier ou une ligne de code.
- [ ] Respecter le minutage : pas plus de 6 min sur la démo ni 2 min 30 sur la valeur ajoutée, quitte à raccourcir l'introduction (voir la vérification de cohérence ci-dessus).
- [ ] Répondre en citant si possible le fichier/la classe source exacte (ex. « documenté dans `MessagingService#assertAccess` »).
- [ ] Rester factuel sur les limites (§12) : arbitrages assumés et documentés, pas des oublis découverts en séance.
