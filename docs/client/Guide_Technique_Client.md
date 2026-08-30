# Guide Technique — Plateforme de Formation à Distance
## Hôtesse / Steward de l'Air

**Document destiné au client**  
**Version :** 1.0 — Niveau Moyen (recommandé)  
**Stack :** Next.js · Spring Boot · PostgreSQL · Redis  
**Date :** Juin 2026

---

## 1. Objet du document

Ce guide présente les choix techniques retenus pour la réalisation de la plateforme e-learning décrite dans l'étude métier détaillée. Il couvre en priorité les deux piliers fonctionnels du **niveau moyen recommandé** :

1. **Éditeur de leçons multi-blocs** — une leçon peut combiner vidéo, texte riche, PDF et image dans un ordre personnalisable.
2. **Moteur de quiz avancé** — tentatives limitées, minuteur fiable côté serveur, randomisation des questions et déblocage progressif des modules.

L'objectif est de donner une vision claire et partagée de l'architecture, sans entrer dans le détail ligne par ligne du code.

---

## 2. Contexte métier rappelé

La formation suit un **parcours linéaire certifiant** : l'étudiant doit valider chaque module avant d'accéder au suivant. La hiérarchie pédagogique est la suivante :

```
Formation
 └── Module (ordre, prérequis)
      └── Leçon (blocs de contenu ordonnés)
      └── Quiz applicatif (formatif, optionnel)
 └── Quiz de fin de module (obligatoire, score minimum)
 └── Quiz pratique (mise en situation)
 └── Quiz final de certification
 └── Diplôme PDF + code de vérification
```

Les acteurs principaux sont : **Administrateur**, **Formateur**, **Étudiant** et éventuellement **Support**.

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                                │
│   Next.js (SSR pages publiques / CSR dashboard étudiant-admin)  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST API
┌────────────────────────────▼────────────────────────────────────┐
│                     SPRING BOOT (API)                            │
│  Auth · Catalogue · Leçons/Blocs · Quiz · Progression · Certif  │
└──────┬──────────────────────┬──────────────────────┬───────────┘
       │                      │                      │
┌──────▼──────┐    ┌──────────▼──────────┐   ┌──────▼──────┐
│ PostgreSQL  │    │       Redis         │   │  Stockage   │
│ (données    │    │ minuteur quiz,      │   │  objet S3   │
│ persistantes│    │ session tentative,  │   │ (vidéos,    │
│             │    │ verrou édition,     │   │ PDF, images)│
│             │    │ cache, rate limit   │   │             │
└─────────────┘    └─────────────────────┘   └─────────────┘
```

### 3.1 Rôle de chaque composant

| Composant | Rôle principal |
|-----------|----------------|
| **Next.js** | Interface utilisateur (étudiant + admin), éditeur de leçons, passage de quiz |
| **Spring Boot** | Logique métier, sécurité, validation des quiz, règles de déblocage |
| **PostgreSQL** | Données durables : utilisateurs, formations, leçons, blocs, quiz, résultats |
| **Redis** | Données temporaires et sensibles au temps : minuteur, tentative en cours, verrou d'édition |
| **Stockage objet** | Fichiers volumineux (vidéos HLS, PDF, images) servis via liens signés |

### 3.2 Principes de sécurité

- Authentification par **JWT** stocké en cookie `httpOnly`.
- Rôles gérés par Spring Security : `ADMIN`, `FORMATEUR`, `ETUDIANT`.
- Les fichiers médias ne sont **jamais** servis directement : liens signés à durée limitée.
- Le minuteur de quiz est **autoritaire côté serveur** : le navigateur n'est qu'un affichage.

---

## 4. Module Leçons — Blocs de contenu ordonnés

### 4.1 Concept

Une leçon n'est plus limitée à un seul type de support. Le formateur compose une leçon à partir de **blocs ordonnés**, par exemple :

1. Vidéo d'introduction (3 min)
2. Texte explicatif enrichi (titres, listes, liens)
3. PDF de référence réglementaire
4. Image schématique (plan de cabine)

Chaque bloc a un **type** et un **contenu structuré** stocké en JSON.

### 4.2 Types de blocs supportés

| Type | Description | Contenu JSON (exemple) |
|------|-------------|------------------------|
| `VIDEO` | Vidéo hébergée (HLS) | `{ "assetId": "...", "title": "...", "durationSec": 180 }` |
| `TEXT` | Texte riche (éditeur Tiptap) | `{ "body": { ...document ProseMirror... } }` |
| `PDF` | Document PDF | `{ "assetId": "...", "title": "...", "pageCount": 12 }` |
| `IMAGE` | Image illustrative | `{ "assetId": "...", "alt": "...", "caption": "..." }` |

### 4.3 Modèle de données (PostgreSQL)

Table principale : **`lesson_block`**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `lesson_id` | UUID | Leçon parente |
| `block_type` | ENUM | `VIDEO`, `TEXT`, `PDF`, `IMAGE` |
| `content` | JSONB | Contenu structuré selon le type |
| `order_index` | INTEGER | Position dans la leçon (0, 1, 2…) |
| `created_at` / `updated_at` | TIMESTAMP | Audit |

> PostgreSQL gère nativement le type **JSONB**, ce qui permet des requêtes et indexation sur le contenu si nécessaire.

### 4.4 API principale

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/lessons/{id}/blocks` | Liste ordonnée des blocs d'une leçon |
| `POST` | `/api/lessons/{id}/blocks` | Création d'un nouveau bloc |
| `PUT` | `/api/lessons/{id}/blocks/{blockId}` | Mise à jour du contenu d'un bloc |
| `DELETE` | `/api/lessons/{id}/blocks/{blockId}` | Suppression d'un bloc |
| **`PATCH`** | **`/api/lessons/{id}/blocks`** | **Réordonnancement en une seule requête** (liste complète avec nouveaux `order_index`) |

Le `PATCH` reçoit un tableau ordonné :

```json
[
  { "id": "uuid-1", "orderIndex": 0 },
  { "id": "uuid-2", "orderIndex": 1 },
  { "id": "uuid-3", "orderIndex": 2 }
]
```

### 4.5 Interface admin (Next.js)

| Fonctionnalité | Technologie | Justification |
|----------------|-------------|---------------|
| Éditeur de texte riche | **Tiptap** (ProseMirror) | Même librairie que LearnHouse (open source), export JSON natif |
| Réordonnancement des blocs | **dnd-kit** ou **@hello-pangea/dnd** | Glisser-déposer fluide, accessible |
| Prévisualisation étudiant | Composants dédiés par type | Lecteur vidéo, visionneuse PDF, rendu Tiptap |

### 4.6 Verrouillage d'édition (sans collaboration temps réel)

Le niveau moyen **n'inclut pas** l'édition collaborative multi-utilisateur (pas de Yjs, pas de curseurs simultanés).

À la place, un **verrouillage simple** :

- Champ `locked_by` (identifiant du formateur) + horodatage sur la leçon.
- Clé Redis `lesson_lock:{lessonId}` avec **TTL** (ex. 30 minutes, renouvelable par heartbeat).
- Si un autre formateur tente d'éditer : message « Cette leçon est en cours d'édition par [Nom] ».
- À l'expiration du TTL ou à la fermeture explicite, le verrou est libéré.

> **Bénéfice client :** évite les écrasements accidentels sans la complexité et le coût d'un éditeur collaboratif temps réel.

---

## 5. Module Quiz — Moteur d'évaluation

### 5.1 Types de quiz

| Type | Moment | Bloquant ? | Score typique |
|------|--------|------------|---------------|
| `APPLICATIF` | Pendant une leçon | Non (formatif) | — |
| `FIN_MODULE` | Fin de module | **Oui** | ≥ 60 % (paramétrable) |
| `PRATIQUE` | Mise en situation | Selon config | Variable |
| `FINAL` | Certification | **Oui** | ≥ 80 % (paramétrable) |

### 5.2 Types de questions (niveau moyen)

| Type | Description |
|------|-------------|
| `SINGLE_CHOICE` | QCM à une seule bonne réponse |
| `MULTI_CHOICE` | QCM à plusieurs bonnes réponses |
| `TRUE_FALSE` | Vrai / Faux |

> Les types « association » et « mise en situation » avancés sont prévus en **Phase 2**.

### 5.3 Paramètres configurables par quiz

- `passingScore` — score minimum de réussite (%)
- `maxAttempts` — nombre de tentatives autorisées
- `timeLimitSeconds` — durée maximale (0 = illimité)
- Randomisation des questions à chaque tentative
- Délai entre tentatives (ex. 24 h) — configurable

### 5.4 Modèle de données (PostgreSQL)

**`quiz`** — définition du quiz  
**`question`** — banque de questions liées au quiz  
**`answer_option`** — choix de réponse par question  
**`quiz_attempt`** — tentative d'un étudiant (persistée à la soumission)

| Champ `quiz_attempt` | Description |
|----------------------|-------------|
| `user_id` | Étudiant |
| `quiz_id` | Quiz concerné |
| `started_at` | Début de la tentative |
| `submitted_at` | Soumission (null si en cours) |
| `score` | Score obtenu (%) |
| `status` | `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `PASSED`, `FAILED` |

### 5.5 Flux de passage d'un quiz

```
Étudiant clique « Commencer »
        │
        ▼
POST /api/quiz/{id}/start
        │
        ├── Vérification : tentatives restantes, module débloqué
        ├── Tirage aléatoire des questions (Collections.shuffle)
        ├── Création tentative en base (status IN_PROGRESS)
        └── Redis : quiz_attempt:{attemptId}  TTL = durée du quiz
                    + stockage ordre des questions
        │
        ▼
Réponse API : { attemptId, expiresAt, questions[] }
        │
        ▼
Interface étudiant : minuteur visuel basé sur expiresAt
        │              (affichage uniquement, pas de confiance client)
        ▼
Soumission manuelle OU auto à expiration
        │
        ▼
POST /api/quiz/{id}/submit
        │
        ├── Vérification Redis : tentative encore valide ?
        ├── Cohérence des réponses avec l'ordre tiré
        ├── Calcul du score
        └── Mise à jour quiz_attempt (score, status)
        │
        ▼
Si score ≥ passingScore → ProgressionService débloque module suivant
```

### 5.6 Minuteur fiable (anti-triche)

| Problème | Solution |
|----------|----------|
| L'étudiant modifie l'horloge de son PC | Le serveur fixe `expiresAt` au démarrage ; Redis expire la clé au bon moment |
| Soumission après le temps imparti | L'API refuse avec HTTP 410 Gone si le TTL Redis a expiré |
| Charge base de données | Les réponses intermédiaires restent en Redis ; écriture PostgreSQL **uniquement à la soumission** |

### 5.7 Randomisation

À chaque `start` :

1. Le service tire un sous-ensemble de questions depuis la banque (`Collections.shuffle`).
2. L'ordre choisi est stocké **en Redis** (temporaire, lié à la tentative).
3. À la soumission, le serveur valide que les réponses correspondent bien aux questions tirées.

> Chaque nouvelle tentative = nouvel ordre et nouvel ensemble de questions.

### 5.8 Déblocage progressif des modules

Règle métier centralisée dans **`ProgressionService`** :

```
Accès module N+1 autorisé SI :
  - Module N terminé (toutes les leçons marquées « vues »)
  ET
  - Quiz FIN_MODULE du module N réussi
      (dernière QuizAttempt avec score ≥ quiz.passingScore)
```

| Endpoint | Comportement |
|----------|--------------|
| `GET /api/modules/{id}` | Retourne le module si accessible, sinon **HTTP 403** avec message explicite |
| Dashboard étudiant | Modules verrouillés affichés visuellement (cadenas + prérequis) |

---

## 6. Rôle de Redis — Synthèse

| Usage | Clé Redis | TTL |
|-------|-----------|-----|
| Minuteur de quiz | `quiz_attempt:{attemptId}` | = `timeLimitSeconds` |
| Ordre questions tirées | `quiz_questions:{attemptId}` | = durée tentative |
| Verrou édition leçon | `lesson_lock:{lessonId}` | 30 min (renouvelable) |
| Cache modules/leçons | `cache:module:{id}` | 5–15 min |
| Rate limiting | `rate:login:{ip}` | 15 min |
| Refresh tokens | `refresh:{tokenId}` | 7–30 jours |

Redis n'est **pas** la base principale : toute donnée critique est persistée dans PostgreSQL à la fin du cycle de vie (soumission quiz, sauvegarde leçon).

---

## 7. Stratégie de stockage médias (PDF, vidéos, slides)

### 7.1 Principe

Les supports pédagogiques (vidéos HLS, PDF, slides) peuvent être stockés **directement sur le VPS Hostinger** pour le MVP, ou sur un **stockage objet externe** (Cloudflare R2, AWS S3) en production. Dans les deux cas, l'accès étudiant passe par des **liens signés à durée limitée** — jamais par une URL publique permanente.

### 7.2 Arborescence sur le VPS

```
/data/media/
├── videos/     → flux HLS (.m3u8 + segments .ts)
├── pdfs/       → documents de référence
├── slides/     → présentations (PDF ou images)
└── images/     → illustrations de leçons
```

Les métadonnées (chemin, taille, type MIME) sont enregistrées en PostgreSQL ; le fichier physique reste sur le disque NVMe du VPS.

### 7.3 Dimensionnement disque (Hostinger)

| Scénario | Volume médias estimé | Plan VPS recommandé |
|----------|----------------------|---------------------|
| MVP — 1 formation, vidéos courtes | < 40 Go | **KVM 2** (100 Go NVMe) |
| 1–2 formations, vidéos HD | 40–80 Go | **KVM 4** (200 Go NVMe) |
| Catalogue étendu | > 100 Go | Stockage externe obligatoire |

> Prévoir ~15 Go pour le système (OS, Docker, logs) et ~10 Go pour PostgreSQL en plus du volume médias.

### 7.4 Chaîne d'accès sécurisé

```
Étudiant authentifié
      │
      ▼
GET /api/assets/{id}/stream   (Spring Boot vérifie JWT + droits module)
      │
      ▼
Réponse : URL signée (expires + token)  OU  en-tête X-Accel-Redirect
      │
      ▼
Nginx sert le fichier depuis /data/media/   (location internal / secure_link)
```

- **PDF et slides** : servis par Nginx, pas par Spring Boot (performance).
- **Vidéos HLS** : segments servis par Nginx ; le lecteur reçoit une playlist dont les URLs sont signées.
- **Upload formateur** : `POST /api/assets/upload` → écriture dans `/data/media/`.

### 7.5 Comparaison des options

| Critère | VPS seul (MVP) | Hybride (PDF VPS + vidéos R2) | Tout externe (S3/R2) |
|---------|:--------------:|:-----------------------------:|:--------------------:|
| Simplicité | ✅ | ⚠️ | ❌ |
| Coût démarrage | ✅ Inclus | ✅ Faible | ⚠️ Variable |
| Streaming vidéo | ⚠️ Limité | ✅ | ✅ |
| Scalabilité | ❌ | ✅ | ✅ |
| Recommandation | Phase dev / MVP | **Production recommandée** | Long terme |

### 7.6 Fichiers de déploiement fournis

Un environnement Docker prêt pour Hostinger KVM est disponible dans le dossier `deploy/` :

| Fichier | Rôle |
|---------|------|
| `deploy/docker-compose.yml` | Stack complète (Nginx, API, frontend, PostgreSQL, Redis) |
| `deploy/nginx/conf.d/elearning.conf` | Reverse proxy + protection médias (`secure_link`) |
| `deploy/.env.example` | Variables d'environnement à copier en `.env` |

**Commandes de déploiement sur le VPS :**

```bash
git clone <repo> && cd E-learning/deploy
cp .env.example .env          # renseigner DOMAIN, secrets, mots de passe
mkdir -p /data/media/{videos,pdfs,slides,images}
docker compose up -d
```

### 7.7 Sauvegardes médias

| Méthode | Fréquence | Cible |
|---------|-----------|-------|
| Snapshot Hostinger (VPS) | Hebdomadaire (inclus) | Restauration complète serveur |
| `rsync /data/media/` | Quotidien | Stockage externe (Backblaze, autre VPS) |
| Backup PostgreSQL | Quotidien | Volume Docker ou dump vers `/data/backups/` |

---

## 8. Périmètre Niveau Moyen vs Phases ultérieures

| Fonctionnalité | Niveau Moyen (MVP+) | Phase 2 |
|----------------|---------------------|---------|
| Blocs multi-contenu par leçon | ✅ | — |
| Éditeur Tiptap + drag-and-drop | ✅ | — |
| Verrouillage édition simple | ✅ | — |
| Collaboration temps réel (Yjs) | ❌ | Optionnel |
| QCM simple / multiple / Vrai-Faux | ✅ | — |
| Minuteur serveur + randomisation | ✅ | — |
| Tentatives limitées + déblocage modules | ✅ | — |
| Questions association / mise en situation | ❌ | ✅ |
| Proctoring (webcam, anti-onglet) | ❌ | ✅ |
| Statistiques avancées / alertes décrochage | Partiel | ✅ |

---

## 9. Livrables techniques attendus

### Backend (Spring Boot)
- Entités JPA + migrations Flyway/Liquibase
- API REST documentée (OpenAPI / Swagger)
- Tests unitaires sur `ProgressionService` et `QuizAttemptService`
- Configuration Redis + PostgreSQL par profil (dev, staging, prod)

### Frontend (Next.js)
- Zone `/admin` : éditeur de leçons par blocs
- Zone `/app` : lecteur de leçons + interface quiz
- Composants réutilisables : `VideoPlayer`, `PdfViewer`, `QuizTimer`, `BlockEditor`

### Infrastructure
- Docker Compose pour environnement de développement
- Scripts de déploiement (CI/CD)
- Sauvegardes PostgreSQL automatisées

---

## 10. Prochaines étapes de validation client

1. **Valider le périmètre niveau moyen** (ce document) avant développement.
2. **Confirmer les règles métier** à paramétrer : scores minimum, tentatives, délais entre tentatives.
3. **Valider les maquettes** (wireframes de l'étude métier) comme base UI.
4. **Choisir l'hébergement** : VPS Hostinger KVM 2 (MVP) ou KVM 4 (production) — datacenter France.
5. **Valider la stratégie médias** : stockage VPS seul (MVP) ou hybride VPS + R2/S3 (production).
6. **Choisir le prestataire paiement** : CMI (Maroc) / Stripe (international).

---

*Document préparé sur la base de l'Étude Métier Détaillée et des spécifications techniques Niveau Moyen. Pour le détail fonctionnel bloc par bloc et endpoint par endpoint, voir la Fiche de Détails Fonctionnels.*
