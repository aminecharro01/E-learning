# Fiche de Détails Fonctionnels et Techniques
## Plateforme E-learning — Hôtesse / Steward de l'Air

**Document destiné au client**  
**Version :** 1.0 — Niveau Moyen (recommandé)  
**Complément du :** Guide Technique Client  
**Date :** Juin 2026

---

## Table des matières

1. [Glossaire](#1-glossaire)
2. [Acteurs et permissions](#2-acteurs-et-permissions)
3. [Parcours étudiant détaillé](#3-parcours-étudiant-détaillé)
4. [Module Leçons — Spécification détaillée](#4-module-leçons--spécification-détaillée)
5. [Module Quiz — Spécification détaillée](#5-module-quiz--spécification-détaillée)
6. [Règles de progression et déblocage](#6-règles-de-progression-et-déblocage)
7. [Catalogue des API REST](#7-catalogue-des-api-rest)
8. [Structures de données JSON](#8-structures-de-données-json)
9. [Écrans et comportements UI](#9-écrans-et-comportements-ui)
10. [Paramètres métier à valider avec l'école](#10-paramètres-métier-à-valider-avec-lécole)
11. [Critères d'acceptation](#11-critères-dacceptation)

---

## 1. Glossaire

| Terme | Définition |
|-------|------------|
| **Formation** | Parcours complet certifiant (ex. « Hôtesse / Steward — Cycle Complet ») |
| **Module** | Unité pédagogique thématique au sein d'une formation |
| **Leçon** | Unité de contenu au sein d'un module, composée de blocs ordonnés |
| **Bloc** | Élément atomique d'une leçon (vidéo, texte, PDF ou image) |
| **Quiz applicatif** | Quiz formatif en cours de leçon, non bloquant |
| **Quiz fin de module** | Évaluation obligatoire pour débloquer le module suivant |
| **Tentative** | Une session de passage d'un quiz, du `start` à la `submit` |
| **Score de passage** | Pourcentage minimum requis pour valider un quiz |
| **JSONB** | Format de stockage JSON optimisé dans PostgreSQL |
| **TTL** | Durée de vie d'une donnée temporaire dans Redis |

---

## 2. Acteurs et permissions

### 2.1 Matrice des droits (extrait — modules concernés)

| Action | Admin | Formateur | Étudiant |
|--------|:-----:|:---------:|:--------:|
| Créer / modifier une formation | ✅ | ⚠️ Ses modules | ❌ |
| Éditer les blocs d'une leçon | ✅ | ✅ (avec verrou) | ❌ |
| Réordonner les blocs (drag-and-drop) | ✅ | ✅ | ❌ |
| Publier une leçon | ✅ | ⚠️ Selon droits | ❌ |
| Consulter une leçon | ✅ | ✅ | ✅ (si module débloqué) |
| Créer / modifier un quiz | ✅ | ✅ | ❌ |
| Passer un quiz | ❌ | ⚠️ Aperçu seul | ✅ |
| Voir les résultats d'un étudiant | ✅ | ⚠️ Ses modules | ✅ (les siens) |
| Débloquer manuellement un module | ✅ | ❌ | ❌ |

### 2.2 Verrouillage d'édition de leçon

**Déclenchement :** le formateur ouvre l'éditeur de leçon en mode édition.

**Comportement :**

1. `POST /api/lessons/{id}/lock` — acquiert le verrou si libre.
2. Heartbeat toutes les 5 minutes : `PATCH /api/lessons/{id}/lock` — renouvelle le TTL Redis.
3. Fermeture ou navigation : `DELETE /api/lessons/{id}/lock` — libère le verrou.
4. Si TTL expiré sans heartbeat : verrou libéré automatiquement.

**Message d'erreur si verrouillé :**
```json
{
  "error": "LESSON_LOCKED",
  "message": "Cette leçon est en cours d'édition par Marie Dupont.",
  "lockedBy": "uuid-formateur",
  "lockedAt": "2026-06-30T10:15:00Z",
  "expiresAt": "2026-06-30T10:45:00Z"
}
```

---

## 3. Parcours étudiant détaillé

### 3.1 Séquence type — Module « Sécurité & Urgences »

| Étape | Action étudiant | Contrôle système |
|-------|-----------------|------------------|
| 1 | Accède au module 1 (débloqué par défaut) | `GET /api/modules/{id}` → 200 |
| 2 | Consulte la leçon 1.1 (vidéo + texte + PDF) | Progression leçon mise à jour |
| 3 | Passe le quiz applicatif (optionnel) | Score affiché, pas de blocage |
| 4 | Termine toutes les leçons du module | Toutes les leçons = `COMPLETED` |
| 5 | Lance le quiz fin de module | Vérif tentatives + minuteur Redis |
| 6 | Obtient ≥ 60 % | `QuizAttempt.status = PASSED` |
| 7 | Module 2 se débloque | `ProgressionService` autorise l'accès |
| 8 | Tente d'accéder au module 3 sans valider le 2 | `GET /api/modules/{id}` → **403** |

### 3.2 États d'un module (côté étudiant)

| État | Icône | Condition |
|------|-------|-----------|
| `LOCKED` | Cadenas | Prérequis non remplis |
| `AVAILABLE` | Ouvert | Prérequis OK, pas encore commencé |
| `IN_PROGRESS` | En cours | Au moins une leçon commencée |
| `COMPLETED` | Validé | Leçons terminées + quiz fin de module réussi |

---

## 4. Module Leçons — Spécification détaillée

### 4.1 Table `lesson_block`

```sql
CREATE TYPE block_type AS ENUM ('VIDEO', 'TEXT', 'PDF', 'IMAGE');

CREATE TABLE lesson_block (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id     UUID NOT NULL REFERENCES lesson(id) ON DELETE CASCADE,
    block_type    block_type NOT NULL,
    content       JSONB NOT NULL DEFAULT '{}',
    order_index   INTEGER NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, order_index)
);

CREATE INDEX idx_lesson_block_lesson ON lesson_block(lesson_id);
CREATE INDEX idx_lesson_block_content ON lesson_block USING GIN (content);
```

### 4.2 Contenu JSON par type de bloc

#### VIDEO
```json
{
  "assetId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Procédure d'évacuation d'urgence",
  "durationSec": 312,
  "thumbnailUrl": "https://cdn.../thumb.jpg",
  "hlsUrl": "https://cdn.../playlist.m3u8"
}
```

#### TEXT (export Tiptap / ProseMirror)
```json
{
  "body": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [{ "type": "text", "text": "Les équipements de sécurité" }]
      },
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "Chaque siège dispose d'un " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "gilet de sauvetage" },
          { "type": "text", "text": " situé sous l'assise." }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Masque à oxygène" }] }] }
        ]
      }
    ]
  }
}
```

#### PDF
```json
{
  "assetId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "title": "Manuel OACI — Extraits réglementaires",
  "pageCount": 24,
  "allowDownload": false
}
```

#### IMAGE
```json
{
  "assetId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "alt": "Plan de cabine avec issues de secours",
  "caption": "Figure 1 — Issues de secours Boeing 737",
  "width": 1200,
  "height": 800
}
```

### 4.3 Opérations CRUD — Règles métier

| Opération | Règle |
|-----------|-------|
| Création bloc | `order_index` = max existant + 1 |
| Suppression bloc | Réindexation automatique des blocs suivants |
| Réordonnancement | Un seul `PATCH` atomique (transaction) |
| Leçon publiée | Modification crée une version brouillon OU modification directe selon config admin |
| Type TEXT | Validation du schéma JSON ProseMirror côté serveur |

### 4.4 Endpoint PATCH — Réordonnancement

**Requête :**
```http
PATCH /api/lessons/{lessonId}/blocks
Content-Type: application/json
Authorization: Bearer {token}

[
  { "id": "block-uuid-1", "orderIndex": 0 },
  { "id": "block-uuid-2", "orderIndex": 1 },
  { "id": "block-uuid-3", "orderIndex": 2 }
]
```

**Réponses :**

| Code | Cas |
|------|-----|
| `200` | Réordonnancement réussi, corps = liste complète mise à jour |
| `400` | Liste incomplète, doublons d'index, ou ID inconnu |
| `403` | Pas le verrou d'édition ou droits insuffisants |
| `409` | Leçon verrouillée par un autre formateur |

### 4.5 Éditeur admin — Fonctionnalités Tiptap

| Fonctionnalité | Inclus niveau moyen |
|----------------|---------------------|
| Titres H1–H3 | ✅ |
| Gras, italique, souligné | ✅ |
| Listes à puces et numérotées | ✅ |
| Liens hypertexte | ✅ |
| Images inline (upload) | ✅ |
| Tableaux simples | ✅ |
| Blocs de code | ⚠️ Optionnel |
| Collaboration temps réel | ❌ |
| Historique des versions | ❌ (Phase 2) |

### 4.6 Drag-and-drop (dnd-kit)

- Poignée de drag sur chaque carte de bloc.
- Zone de dépôt entre les blocs.
- À la fin du drag : appel `PATCH /api/lessons/{id}/blocks`.
- Indicateur visuel de sauvegarde (toast « Ordre enregistré »).
- Rollback visuel si l'API échoue.

### 4.7 Stockage des supports (PDF, vidéos, slides)

Les fichiers physiques sont stockés sur le VPS sous `/data/media/` (voir `deploy/docker-compose.yml`). L'API expose :

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/assets/upload` | Upload formateur (vidéo HLS, PDF, slide) |
| `GET` | `/api/assets/{id}/stream` | Génère une URL signée (expires + token) |

**Protection :** Nginx sert les fichiers via `secure_link` — l'étudiant ne peut pas deviner l'URL directe. Le secret partagé est `MEDIA_SIGNING_SECRET` (identique entre Spring Boot et Nginx).

**JSONB bloc VIDEO (stockage VPS) :**
```json
{
  "assetId": "uuid",
  "storagePath": "videos/module1/lecon1/index.m3u8",
  "title": "Procédure d'évacuation",
  "durationSec": 312
}
```

---

## 5. Module Quiz — Spécification détaillée

### 5.1 Tables principales

```sql
CREATE TYPE quiz_type AS ENUM (
    'APPLICATIF', 'FIN_MODULE', 'PRATIQUE', 'FINAL'
);

CREATE TYPE question_type AS ENUM (
    'SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE'
);

CREATE TYPE attempt_status AS ENUM (
    'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'PASSED', 'FAILED'
);

CREATE TABLE quiz (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id           UUID REFERENCES module(id),
    quiz_type           quiz_type NOT NULL,
    title               VARCHAR(255) NOT NULL,
    passing_score       INTEGER NOT NULL DEFAULT 60,
    max_attempts        INTEGER NOT NULL DEFAULT 2,
    time_limit_seconds  INTEGER DEFAULT 0,
    question_count      INTEGER,
    shuffle_questions   BOOLEAN DEFAULT TRUE,
    shuffle_answers     BOOLEAN DEFAULT TRUE,
    cooldown_hours      INTEGER DEFAULT 24,
    published           BOOLEAN DEFAULT FALSE
);

CREATE TABLE question (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id     UUID NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
    type        question_type NOT NULL,
    text        TEXT NOT NULL,
    explanation TEXT,
    points      INTEGER DEFAULT 1,
    order_index INTEGER
);

CREATE TABLE answer_option (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    text         TEXT NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    order_index  INTEGER
);

CREATE TABLE quiz_attempt (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id      UUID NOT NULL REFERENCES quiz(id),
    user_id      UUID NOT NULL REFERENCES app_user(id),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    score        DECIMAL(5,2),
    status       attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
    attempt_number INTEGER NOT NULL
);
```

### 5.2 Paramètres par type de quiz (valeurs par défaut proposées)

| Paramètre | APPLICATIF | FIN_MODULE | PRATIQUE | FINAL |
|-----------|:----------:|:----------:|:--------:|:-----:|
| `passingScore` | — | 60 % | 70 % | 80 % |
| `maxAttempts` | ∞ | 2 | 2 | 1 |
| `timeLimitSeconds` | 0 | 1800 (30 min) | 2400 (40 min) | 3600 (60 min) |
| `cooldownHours` | 0 | 24 | 24 | 48 |
| Bloque progression | Non | **Oui** | Configurable | **Oui** |

> Toutes ces valeurs sont **paramétrables** par l'administrateur pour chaque quiz.

### 5.3 Flux API — Démarrage de tentative

**Requête :**
```http
POST /api/quiz/{quizId}/start
Authorization: Bearer {token}
```

**Contrôles serveur (dans l'ordre) :**

1. Quiz publié et accessible (module débloqué).
2. Nombre de tentatives < `maxAttempts`.
3. Si échec précédent : délai `cooldownHours` écoulé.
4. Pas de tentative `IN_PROGRESS` existante (ou reprise autorisée).

**Actions serveur :**

1. Tirage aléatoire de `question_count` questions (ou toutes si non défini).
2. Mélange des options de réponse si `shuffle_answers = true`.
3. Insertion `quiz_attempt` (status `IN_PROGRESS`).
4. Redis :
   - `SET quiz_attempt:{attemptId}` → `{ userId, quizId, startedAt, expiresAt }` EX `{timeLimitSeconds}`
   - `SET quiz_questions:{attemptId}` → `[questionId1, questionId2, ...]` EX `{timeLimitSeconds}`

**Réponse :**
```json
{
  "attemptId": "attempt-uuid",
  "expiresAt": "2026-06-30T11:30:00Z",
  "timeLimitSeconds": 1800,
  "questions": [
    {
      "id": "q-uuid-1",
      "type": "SINGLE_CHOICE",
      "text": "Quelle est la première action en cas de dépressurisation ?",
      "options": [
        { "id": "opt-1", "text": "Enfiler son masque à oxygène" },
        { "id": "opt-2", "text": "Ouvrir les issues de secours" },
        { "id": "opt-3", "text": "Demander aux passagers de rester assis" },
        { "id": "opt-4", "text": "Contacter le cockpit" }
      ]
    }
  ]
}
```

> Les bonnes réponses (`is_correct`) ne sont **jamais** envoyées au client avant correction.

### 5.4 Flux API — Soumission

**Requête :**
```http
POST /api/quiz/{quizId}/submit
Content-Type: application/json

{
  "attemptId": "attempt-uuid",
  "answers": [
    { "questionId": "q-uuid-1", "selectedOptionIds": ["opt-1"] },
    { "questionId": "q-uuid-2", "selectedOptionIds": ["opt-5", "opt-7"] }
  ]
}
```

**Contrôles serveur :**

1. Clé Redis `quiz_attempt:{attemptId}` existe → sinon HTTP **410 Gone** (expiré).
2. `userId` de la tentative = utilisateur authentifié.
3. Chaque `questionId` correspond à l'ordre stocké dans `quiz_questions:{attemptId}`.
4. Calcul du score : `(points obtenus / points totaux) × 100`.

**Mise à jour :**
- `quiz_attempt.submitted_at`, `score`, `status` (`PASSED` ou `FAILED`).
- Suppression des clés Redis.
- Appel `ProgressionService.onQuizCompleted(attempt)` si `FIN_MODULE` ou `FINAL`.

**Réponse :**
```json
{
  "attemptId": "attempt-uuid",
  "score": 75.0,
  "passingScore": 60,
  "status": "PASSED",
  "passed": true,
  "results": [
    {
      "questionId": "q-uuid-1",
      "correct": true,
      "explanation": "Le masque à oxygène doit être enfilé immédiatement..."
    },
    {
      "questionId": "q-uuid-2",
      "correct": false,
      "correctOptionIds": ["opt-6"],
      "explanation": "..."
    }
  ],
  "moduleUnlocked": {
    "moduleId": "next-module-uuid",
    "title": "Service à bord"
  }
}
```

### 5.5 Expiration automatique

| Événement | Comportement |
|-----------|--------------|
| TTL Redis expire | Tentative marquée `EXPIRED` (job ou à la prochaine requête) |
| Frontend atteint `expiresAt` | Soumission auto avec réponses saisies |
| Soumission après expiration | HTTP 410 — « Le temps imparti est écoulé » |
| Tentative expirée | Compte comme une tentative consommée |

### 5.6 Interface quiz étudiant (Next.js)

| Élément | Comportement |
|---------|--------------|
| Minuteur | Affichage basé sur `expiresAt` API ; changement de couleur < 5 min |
| Navigation | Boutons Précédent / Suivant + indicateur « Question 3/15 » |
| Soumission | Bouton « Terminer » + confirmation si questions sans réponse |
| Auto-submit | À `expiresAt`, envoi automatique sans confirmation |
| Hors ligne | Non supporté — message d'erreur si perte de connexion |
| Anti-triche navigateur | Niveau moyen : minuteur serveur uniquement (pas de détection changement d'onglet) |

---

## 6. Règles de progression et déblocage

### 6.1 ProgressionService — Pseudo-logique

```
fonction canAccessModule(userId, moduleId):
    module = charger(moduleId)
    si module.ordre == 1:
        retourner VRAI

    modulePrecedent = charger(module.formationId, module.ordre - 1)

    si non toutesLeconsTerminees(userId, modulePrecedent.id):
        retourner FAUX

    quizFinModule = chargerQuiz(modulePrecedent.id, type=FIN_MODULE)
    si quizFinModule existe:
        derniereTentative = chargerDerniereTentative(userId, quizFinModule.id)
        si derniereTentative == null OU derniereTentative.score < quizFinModule.passingScore:
            retourner FAUX

    retourner VRAI
```

### 6.2 Progression leçon

| Statut | Condition |
|--------|-----------|
| `NOT_STARTED` | Aucune consultation |
| `IN_PROGRESS` | Au moins un bloc consulté |
| `COMPLETED` | Vidéo vue à ≥ 90 % OU scroll PDF/texte terminé (configurable) |

### 6.3 Diplôme — Conditions (rappel étude métier)

- 100 % des modules validés.
- Quiz `FINAL` réussi (score ≥ `passingScore`).
- Paiement de l'inscription à jour.
- Génération PDF + code UUID de vérification publique.

---

## 7. Catalogue des API REST

### 7.1 Leçons et blocs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/lessons/{id}` | Détail leçon + métadonnées |
| `GET` | `/api/lessons/{id}/blocks` | Liste ordonnée des blocs |
| `POST` | `/api/lessons/{id}/blocks` | Créer un bloc |
| `PUT` | `/api/lessons/{id}/blocks/{blockId}` | Modifier le contenu |
| `DELETE` | `/api/lessons/{id}/blocks/{blockId}` | Supprimer un bloc |
| `PATCH` | `/api/lessons/{id}/blocks` | Réordonner tous les blocs |
| `POST` | `/api/lessons/{id}/lock` | Acquérir verrou édition |
| `PATCH` | `/api/lessons/{id}/lock` | Renouveler verrou (heartbeat) |
| `DELETE` | `/api/lessons/{id}/lock` | Libérer verrou |

### 7.2 Quiz

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/quiz/{id}` | Config quiz (sans bonnes réponses) |
| `POST` | `/api/quiz/{id}/start` | Démarrer une tentative |
| `POST` | `/api/quiz/{id}/submit` | Soumettre les réponses |
| `GET` | `/api/quiz/{id}/attempts` | Historique tentatives (étudiant) |
| `GET` | `/api/quiz/{id}/attempts/{attemptId}` | Détail d'une tentative passée |

### 7.3 Progression

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/modules/{id}` | Détail module (403 si verrouillé) |
| `GET` | `/api/formations/{id}/progress` | Progression globale étudiant |
| `POST` | `/api/lessons/{id}/progress` | Mise à jour progression leçon |

---

## 8. Structures de données Redis

| Clé | Type | Contenu | TTL |
|-----|------|---------|-----|
| `quiz_attempt:{attemptId}` | Hash | `userId`, `quizId`, `startedAt`, `expiresAt` | `timeLimitSeconds` |
| `quiz_questions:{attemptId}` | List | IDs questions dans l'ordre tiré | `timeLimitSeconds` |
| `quiz_answers:{attemptId}` | Hash | Réponses temporaires (optionnel) | `timeLimitSeconds` |
| `lesson_lock:{lessonId}` | String | `userId` du formateur | 30 min |
| `cache:module:{moduleId}` | String (JSON) | Structure module + leçons | 10 min |

---

## 9. Écrans et comportements UI

### 9.1 Admin — Éditeur de leçon

```
┌─────────────────────────────────────────────────────────────┐
│  ← Retour    Leçon 1.2 — Évacuation d'urgence    [Publier] │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Bloc 1 ─────────────────────────────── ≡ (drag) ────┐ │
│  │  🎬 VIDÉO — Procédure d'évacuation          [✎] [🗑]  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─ Bloc 2 ─────────────────────────────── ≡ ────────────┐ │
│  │  📝 TEXTE — [Barre outils Tiptap]            [✎] [🗑]  │ │
│  │  Les équipements de sécurité...                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌─ Bloc 3 ─────────────────────────────── ≡ ────────────────┐ │
│  │  📄 PDF — Manuel OACI                        [✎] [🗑]  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [+ Ajouter un bloc ▼]  Vidéo | Texte | PDF | Image        │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Étudiant — Lecteur de leçon

- Affichage séquentiel ou onglets selon nombre de blocs.
- Vidéo : reprise position, sous-titres, vitesse 0.75×–1.5×.
- PDF : visionneuse intégrée, téléchargement désactivé par défaut.
- Marquage automatique de progression.

### 9.3 Étudiant — Passage de quiz

```
┌─────────────────────────────────────────────────────────────┐
│  Quiz — Fin de module « Sécurité & Urgences »               │
│  ⏱ 24:35 restantes          Question 5 / 15    ████░░ 33%  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quelle est la procédure en cas de détecteur de fumée       │
│  déclenché aux toilettes ?                                  │
│                                                             │
│  ○ Alerter immédiatement le cockpit                         │
│  ○ Ouvrir la porte des toilettes                            │
│  ● Vérifier la porte sans l'ouvrir, alerter le chef de cabine│
│  ○ Déclencher l'alarme générale                             │
│                                                             │
│         [← Précédent]              [Suivant →]              │
│                                                             │
│  Score minimum requis : 60 %    Tentative 1 / 2             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Paramètres métier à valider avec l'école

Les valeurs ci-dessous sont des **propositions** à confirmer lors du cadrage :

| # | Question | Proposition par défaut |
|---|----------|------------------------|
| 1 | Score minimum quiz fin de module | 60 % |
| 2 | Score minimum quiz final | 80 % |
| 3 | Nombre de tentatives quiz fin de module | 2 |
| 4 | Nombre de tentatives quiz final | 1 |
| 5 | Délai entre deux tentatives après échec | 24 h (module), 48 h (final) |
| 6 | Durée quiz fin de module | 30 minutes |
| 7 | Durée quiz final | 60 minutes |
| 8 | Marquage leçon « terminée » | Vidéo vue à 90 % minimum |
| 9 | Quiz applicatif bloquant ? | Non |
| 10 | Affichage correction après quiz | Immédiat avec explications |
| 11 | Durée verrou édition leçon | 30 minutes |
| 12 | Accès formation après paiement | Illimité vs 12 mois |

---

## 11. Critères d'acceptation

### 11.1 Module Leçons — Blocs

- [ ] Un formateur peut créer une leçon avec au moins 4 types de blocs différents.
- [ ] Le texte riche est éditable via Tiptap et persisté en JSONB.
- [ ] Le glisser-déposer réordonne les blocs et persiste via un seul appel PATCH.
- [ ] Un second formateur ne peut pas éditer une leçon verrouillée.
- [ ] Le verrou expire après 30 minutes d'inactivité.
- [ ] L'étudiant voit les blocs dans l'ordre défini par le formateur.

### 11.2 Module Quiz

- [ ] Un étudiant ne peut pas soumettre un quiz après expiration du minuteur serveur.
- [ ] Modifier l'horloge du navigateur n'accorde pas de temps supplémentaire.
- [ ] Chaque nouvelle tentative présente les questions dans un ordre différent.
- [ ] Le nombre de tentatives est respecté (blocage après `maxAttempts`).
- [ ] Le délai de cooldown entre tentatives est appliqué.
- [ ] Un module reste verrouillé tant que le quiz fin de module n'est pas réussi.
- [ ] `GET /api/modules/{id}` retourne 403 pour un module non débloqué.
- [ ] La soumission automatique à expiration fonctionne côté frontend.

### 11.3 Non-régression / sécurité

- [ ] Les bonnes réponses ne sont jamais exposées avant soumission.
- [ ] Les fichiers PDF/vidéo sont servis via liens signés expirants.
- [ ] Les rôles sont respectés sur tous les endpoints.

---

## Annexe — Correspondance avec l'étude métier

| Section étude métier | Couvert par ce document |
|----------------------|-------------------------|
| §2 Parcours formation | §3, §6 |
| §3.1 Créateur de contenu / quiz | §4, §5 |
| §3.2 Interface quiz étudiant | §5.6, §9.3 |
| §4 Architecture technique | Guide Technique §3 |
| §5 Modèle de données | §4.1, §5.1 |
| §7 Rôle de Redis | §8, Guide Technique §6 |
| §8 Phase 1 MVP | §11 (critères d'acceptation) |

---

*Ce document constitue la référence fonctionnelle et technique détaillée pour la validation client. Toute évolution de périmètre fera l'objet d'un avenant versionné.*
