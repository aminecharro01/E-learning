# Détails complets de l'application — IAT Academy

**Plateforme e-learning**  
**Version :** 1.0  
**Date :** Juillet 2026  
**Stack :** Next.js · Spring Boot · PostgreSQL · Redis · Docker

> Document de référence technique et fonctionnelle : architecture, technologies, modules, modèles de données, sécurité, hébergement et livrables.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Stack technologique](#2-stack-technologique)
3. [Architecture globale](#3-architecture-globale)
4. [Structure pédagogique](#4-structure-pédagogique)
5. [Acteurs et rôles](#5-acteurs-et-rôles)
6. [Modules fonctionnels](#6-modules-fonctionnels)
7. [Modèle de données](#7-modèle-de-données)
8. [API REST (aperçu)](#8-api-rest-aperçu)
9. [Sécurité](#9-sécurité)
10. [Médias et stockage](#10-médias-et-stockage)
11. [Infrastructure et déploiement](#11-infrastructure-et-déploiement)
12. [Écrans principaux](#12-écrans-principaux)
13. [Périmètre MVP vs phases suivantes](#13-périmètre-mvp-vs-phases-suivantes)
14. [Livrables attendus](#14-livrables-attendus)

---

## 1. Vue d'ensemble

### 1.1 Qu'est-ce que l'application ?

Une **plateforme de formation en ligne** pour IAT Academy, permettant aux apprenants de suivre un parcours de **20 modules**, de consulter contenus et vidéos par section, de passer des quiz et évaluations, puis d'obtenir une **attestation de réussite** automatique.

### 1.2 Objectif technique

Construire une application web **fiable, sécurisée et évolutive** avec :

- un **frontend** moderne (expérience apprenant + administration)
- une **API backend** solide (règles métier, sécurité, évaluations)
- une **base de données** relationnelle (données durables)
- un **cache / session store** (minuteur quiz, verrous, rate limiting)
- un **stockage médias** (vidéos, PDF, images) servi de façon sécurisée

### 1.3 Principe clé

La plateforme **reçoit et diffuse** les contenus produits hors plateforme par l'équipe IAT Academy (scripts, PowerPoint, vidéos, banques de questions). Le **Guide Master** reste un document interne non publié.

---

## 2. Stack technologique

### 2.1 Frontend

| Technologie | Rôle |
|-------------|------|
| **Next.js** (React / TypeScript) | Application web (SSR pages publiques, CSR dashboards) |
| **TypeScript** | Typage fort, maintien du code frontend |
| **Tailwind CSS** *(ou CSS Modules)* | Styles UI |
| **Tiptap** (ProseMirror) | Éditeur de texte riche (blocs TEXT) |
| **dnd-kit** ou **@hello-pangea/dnd** | Glisser-déposer des blocs de leçon |
| **Lecteur vidéo HLS** (ex. hls.js / Video.js) | Lecture des vidéos pédagogiques |
| **Axios / Fetch** | Appels API REST |

### 2.2 Backend

| Technologie | Rôle |
|-------------|------|
| **Java 17+** | Langage backend |
| **Spring Boot** | Framework API REST |
| **Spring Security** | Authentification, autorisation (rôles) |
| **Spring Data JPA** | Accès base de données |
| **JWT** (cookie `httpOnly`) | Session authentifiée |
| **Flyway** ou **Liquibase** | Migrations de schéma |
| **OpenAPI / Swagger** | Documentation API |
| **iText / OpenPDF** *(ou lib similaire)* | Génération PDF attestation |

### 2.3 Données et cache

| Technologie | Rôle |
|-------------|------|
| **PostgreSQL** | Base principale (utilisateurs, modules, leçons, quiz, progression, attestations) |
| **Redis** | Minuteur quiz, tentatives en cours, verrou édition, cache, rate limiting |

### 2.4 Stockage et reverse proxy

| Technologie | Rôle |
|-------------|------|
| **Stockage disque VPS** et/ou **S3 / Cloudflare R2** | Vidéos HLS, PDF, images, slides |
| **Nginx** | Reverse proxy, HTTPS, liens sécurisés médias (`secure_link`) |
| **FFmpeg** *(outil)* | Encodage / préparation HLS des vidéos (hors runtime si prétraite) |

### 2.5 DevOps / Infrastructure

| Technologie | Rôle |
|-------------|------|
| **Docker** + **Docker Compose** | Conteneurisation (API, frontend, Postgres, Redis, Nginx) |
| **Hostinger VPS** (KVM) | Hébergement MVP / production |
| **Git** | Versionning |
| **CI/CD** *(optionnel Phase 1)* | Build et déploiement automatisés |

### 2.6 Synthèse stack (une ligne)

```
Next.js (TS)  →  Spring Boot (Java)  →  PostgreSQL + Redis  →  Nginx + Médias (VPS/S3)
```

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                                │
│   Next.js — pages publiques / dashboard apprenant / admin        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST API (JWT)
┌────────────────────────────▼────────────────────────────────────┐
│                     SPRING BOOT (API)                            │
│  Auth · Cataloge · Leçons/Blocs · Quiz · Progression · Certif   │
└──────┬──────────────────────┬──────────────────────┬───────────┘
       │                      │                      │
┌──────▼──────┐    ┌──────────▼──────────┐   ┌──────▼──────┐
│ PostgreSQL  │    │       Redis         │   │  Stockage   │
│ (données    │    │ minuteur quiz,      │   │  médias     │
│ persistantes│    │ session tentative,  │   │ vidéos/PDF  │
│             │    │ verrou édition,     │   │ liens signés│
│             │    │ cache, rate limit   │   │             │
└─────────────┘    └─────────────────────┘   └─────────────┘
```

### 3.1 Rôle de chaque couche

| Couche | Responsabilité |
|--------|----------------|
| **Next.js** | UI apprenant + admin, éditeur de leçons, interface quiz |
| **Spring Boot** | Logique métier, sécurité, scoring quiz, déblocage modules, PDF attestation |
| **PostgreSQL** | Persistance durable |
| **Redis** | Données temporaires / temporelles (TTL) |
| **Nginx + médias** | Performance et protection des fichiers lourds |

---

## 4. Structure pédagogique

### 4.1 Hiérarchie IAT Academy

```
Formation IAT Academy (20 modules)
 └── Module (ordre, prérequis)
      └── Section / Leçon
           ├── Bloc contenu (texte)
           ├── Bloc vidéo
           ├── Blocs optionnels (PDF, slides, image)
           └── Quiz de fin de section ☆
      └── Évaluation finale du module (100 questions) ★
 └── Attestation de réussite (PDF automatique)
```

☆ Quiz formatif (bloquant ou non — à valider avec le client)  
★ Quiz bloquant pour débloquer le module suivant

### 4.2 Correspondance vocabulaire

| Terme client (IAT Academy) | Terme technique (application) |
|----------------------------|-------------------------------|
| Module (×20) | `Module` |
| Section pédagogique | `Lesson` (leçon) |
| Contenu de formation | Bloc `TEXT` (+ `PDF` / slides) |
| Vidéo pédagogique | Bloc `VIDEO` |
| Quiz fin de section | Quiz type `APPLICATIF` / fin de section |
| Évaluation 100 Q | Quiz type `FIN_MODULE` |
| Attestation de réussite | Certificat / attestation PDF |
| Guide Master | **Hors application** |

---

## 5. Acteurs et rôles

| Rôle | Accès principal |
|------|-----------------|
| **ADMIN** | Gestion globale : utilisateurs, formations, modules, stats, attestations, déblocages manuels |
| **FORMATEUR** | Création / édition des leçons, blocs, quiz ; publication des contenus |
| **ETUDIANT / APPRENANT** | Suivi des modules, lecture des sections, passage des quiz, attestation |
| **SUPPORT** *(optionnel)* | Aide utilisateurs, tickets / FAQ |

Matrice (simplifiée) :

| Action | Admin | Formateur | Apprenant |
|--------|:-----:|:---------:|:---------:|
| Gérer formations / modules | ✅ | ⚠️ | ❌ |
| Éditer blocs de leçon | ✅ | ✅ | ❌ |
| Créer / modifier quiz | ✅ | ✅ | ❌ |
| Passer un quiz | ❌ | Aperçu | ✅ |
| Voir ses résultats | ✅ | ⚠️ | ✅ (les siens) |
| Débloquer un module manuellement | ✅ | ❌ | ❌ |
| Télécharger attestation | ✅ | ❌ | ✅ (si validé) |

---

## 6. Modules fonctionnels

### 6.1 Authentification et comptes

- Inscription / connexion (email)
- JWT en cookie `httpOnly`
- Mot de passe hashé (BCrypt)
- Rôles Spring Security
- Rate limiting sur login (Redis)

### 6.2 Catalogue pédagogique

- Formation unique IAT Academy (extensible à plusieurs formations)
- 20 modules ordonnés
- Sections (leçons) par module
- États côté apprenant : `LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`

### 6.3 Éditeur de leçons (multi-blocs)

Le formateur compose une section avec des **blocs ordonnés** :

| Type | Description |
|------|-------------|
| `VIDEO` | Vidéo HLS (support principal) |
| `TEXT` | Texte riche Tiptap |
| `PDF` | Document de référence |
| `IMAGE` | Illustration / schéma |
| Slides | PDF ou images (complément PowerPoint) |

Fonctionnalités :

- Ajout / modification / suppression de blocs
- Réordonnancement (drag-and-drop)
- Verrouillage d'édition (1 formateur à la fois via Redis)
- Prévisualisation vue apprenant

### 6.4 Moteur de quiz

| Type quiz | Moment | Bloquant |
|-----------|--------|----------|
| Fin de section | Après chaque section | À valider (formatif par défaut) |
| Fin de module | Après toutes les sections | **Oui** (100 questions) |

Types de questions (MVP) :

- `SINGLE_CHOICE` — QCM 1 réponse
- `MULTI_CHOICE` — QCM plusieurs réponses
- `TRUE_FALSE` — Vrai / Faux

Paramètres configurables :

- `passingScore` (%)
- `maxAttempts`
- `timeLimitSeconds`
- Randomisation questions / options
- Délai entre tentatives

Flux technique :

```
Start → vérif droits + tentatives
     → création quiz_attempt (IN_PROGRESS)
     → Redis TTL = durée max
     → affichage minuteur (client = affichage seulement)
     → Submit → scoring serveur
     → PASSED → ProgressionService débloque module suivant
```

### 6.5 Progression

Règle centrale :

```
Accès Module N+1 SI :
  - toutes les sections du Module N terminées
  ET évaluation FIN_MODULE du Module N réussie (score ≥ passingScore)
```

Suivi :

- % global de formation
- module en cours
- reprise de lecture vidéo

### 6.6 Attestation de réussite

- Génération automatique après validation des **20 modules**
- PDF téléchargeable
- Code unique de vérification (page publique — à confirmer)
- Métadonnées en base (date, utilisateur, formation)

### 6.7 Administration

- CRUD modules / sections / blocs / quiz / questions
- Gestion utilisateurs et rôles
- Stats de base (progression, résultats)
- Upload médias

---

## 7. Modèle de données

### 7.1 Entités principales (PostgreSQL)

| Entité | Description |
|--------|-------------|
| `users` | Comptes (email, hash, rôle) |
| `formations` | Parcours (IAT Academy) |
| `modules` | Modules ordonnés (prérequis) |
| `lessons` | Sections / leçons |
| `lesson_blocks` | Blocs de contenu (JSONB) |
| `assets` | Métadonnées fichiers médias |
| `quizzes` | Définition quiz (type, paramètres) |
| `questions` | Banque de questions |
| `answer_options` | Choix de réponses |
| `quiz_attempts` | Tentatives apprenant |
| `lesson_progress` | Progression section / module |
| `certificates` | Attestations générées |

### 7.2 Exemple `lesson_block`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant |
| `lesson_id` | UUID | Leçon parente |
| `block_type` | ENUM | `VIDEO`, `TEXT`, `PDF`, `IMAGE` |
| `content` | JSONB | Contenu selon le type |
| `order_index` | INTEGER | Position |
| `created_at` / `updated_at` | TIMESTAMP | Audit |

### 7.3 Exemple `quiz_attempt`

| Champ | Description |
|-------|-------------|
| `user_id` | Apprenant |
| `quiz_id` | Quiz |
| `started_at` | Début |
| `submitted_at` | Soumission |
| `score` | Score (%) |
| `status` | `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `PASSED`, `FAILED` |

### 7.4 Clés Redis (TTL)

| Usage | Clé | TTL |
|-------|-----|-----|
| Minuteur quiz | `quiz_attempt:{attemptId}` | = durée quiz |
| Ordre questions | `quiz_questions:{attemptId}` | = durée tentative |
| Verrou édition | `lesson_lock:{lessonId}` | 30 min (renouvelable) |
| Rate login | `rate:login:{ip}` | 15 min |
| Cache module | `cache:module:{id}` | 5–15 min |

---

## 8. API REST (aperçu)

### 8.1 Auth

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `POST` | `/api/auth/logout` | Déconnexion |
| `GET` | `/api/auth/me` | Profil courant |

### 8.2 Catalogue / progression

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/formations/{id}` | Détail formation |
| `GET` | `/api/modules/{id}` | Module (403 si verrouillé) |
| `GET` | `/api/progress/me` | Progression apprenant |

### 8.3 Leçons / blocs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/lessons/{id}/blocks` | Liste ordonnée des blocs |
| `POST` | `/api/lessons/{id}/blocks` | Créer un bloc |
| `PUT` | `/api/lessons/{id}/blocks/{blockId}` | Modifier |
| `DELETE` | `/api/lessons/{id}/blocks/{blockId}` | Supprimer |
| `PATCH` | `/api/lessons/{id}/blocks` | Réordonner |
| `POST` | `/api/lessons/{id}/lock` | Acquérir verrou |
| `DELETE` | `/api/lessons/{id}/lock` | Libérer verrou |

### 8.4 Quiz

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/quiz/{id}/start` | Démarrer tentative |
| `POST` | `/api/quiz/{id}/submit` | Soumettre réponses |
| `GET` | `/api/quiz/{id}/attempts` | Historique |

### 8.5 Médias / attestation

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/assets/upload` | Upload formateur |
| `GET` | `/api/assets/{id}/stream` | URL signée |
| `GET` | `/api/certificates/me` | Attestation de l'apprenant |
| `GET` | `/api/certificates/verify/{code}` | Vérification publique |

---

## 9. Sécurité

| Mesure | Détail |
|--------|--------|
| Authentification | JWT en cookie `httpOnly` + `Secure` + `SameSite` |
| Autorisation | Rôles Spring Security (`ADMIN`, `FORMATEUR`, `ETUDIANT`) |
| Médias | Jamais d'URL publique permanente — liens signés / `X-Accel-Redirect` |
| Quiz | Minuteur **serveur** (Redis TTL) ; refus après expiration (HTTP 410) |
| Anti-abus login | Rate limiting Redis |
| Mots de passe | Hash BCrypt |
| HTTPS | Terminé au niveau Nginx |
| Contenu | Modules verrouillés tant que prérequis non validés |

---

## 10. Médias et stockage

### 10.1 Arborescence (MVP VPS)

```
/data/media/
├── videos/     → HLS (.m3u8 + .ts)
├── pdfs/       → documents
├── slides/     → présentations
└── images/     → illustrations
```

### 10.2 Options de stockage

| Option | Usage |
|--------|-------|
| **VPS seul** | MVP / lancement |
| **Hybride** (PDF VPS + vidéos R2/S3) | Production recommandée |
| **Tout S3/R2** | Long terme / fort volume |

### 10.3 Dimensionnement indicative

| Scénario | Volume médias | Plan VPS |
|----------|---------------|----------|
| MVP — vidéos courtes | < 40 Go | Hostinger KVM 2 (100 Go) |
| 1–2 formations HD | 40–80 Go | KVM 4 (200 Go) |
| Catalogue étendu | > 100 Go | Stockage externe obligatoire |

---

## 11. Infrastructure et déploiement

### 11.1 Stack Docker (cible)

```
Nginx
 ├── Frontend (Next.js)
 ├── API (Spring Boot)
 ├── PostgreSQL
 └── Redis
```

Fichiers type (dossier `deploy/`) :

- `docker-compose.yml`
- `nginx/conf.d/elearning.conf`
- `.env.example`

### 11.2 Environnements

| Environnement | Usage |
|---------------|-------|
| `dev` | Développement local |
| `staging` | Recette client |
| `prod` | Production Hostinger |

### 11.3 Sauvegardes

| Élément | Fréquence | Méthode |
|---------|-----------|---------|
| PostgreSQL | Quotidien | Dump / volume |
| Médias `/data/media` | Quotidien | `rsync` externe |
| VPS | Hebdomadaire | Snapshot Hostinger |

---

## 12. Écrans principaux

### 12.1 Apprenant (`/app`)

- Connexion / tableau de bord progression
- Liste des 20 modules (cadenas / en cours / validé)
- Lecteur de section (blocs texte, vidéo, PDF…)
- Interface quiz (chrono, navigation questions, résultat)
- Téléchargement attestation

### 12.2 Admin / Formateur (`/admin`)

- Gestion modules & sections
- Éditeur multi-blocs (Tiptap + drag-and-drop)
- Gestion quiz & banque de questions
- Upload médias
- Suivi résultats / progression
- Paramètres (scores, tentatives, durées)

### 12.3 Public

- Landing / présentation (optionnel)
- Page vérification attestation par code

---

## 13. Périmètre MVP vs phases suivantes

### 13.1 Inclus MVP (niveau recommandé)

| Fonctionnalité | Statut |
|----------------|:------:|
| Auth + rôles | ✅ |
| 20 modules, progression linéaire | ✅ |
| Sections multi-blocs (vidéo, texte, PDF, image) | ✅ |
| Éditeur formateur + verrou d'édition | ✅ |
| Quiz section + évaluation fin module | ✅ |
| QCM simple / multiple / Vrai-Faux | ✅ |
| Minuteur serveur + randomisation + tentatives | ✅ |
| Attestation PDF + code vérification | ✅ |
| Déploiement Docker sur VPS | ✅ |

### 13.2 Phase 2 (optionnel)

| Fonctionnalité | Statut |
|----------------|:------:|
| Paiement en ligne (CMI / Stripe) | ⏳ |
| Questions avancées (association, mise en situation) | ⏳ |
| Proctoring (webcam, anti-onglet) | ⏳ |
| Stats avancées / alertes décrochage | ⏳ |
| Multilingue FR / AR / EN | ⏳ |
| App mobile native | ⏳ |
| Collaboration temps réel (Yjs) | ⏳ |
| Sessions live (visioconférence) | ⏳ |

---

## 14. Livrables attendus

### Backend

- Entités JPA + migrations Flyway/Liquibase
- API REST documentée (Swagger)
- Services : Auth, Lessons, Quiz, Progression, Certificates
- Tests unitaires sur règles de progression et scoring quiz

### Frontend

- Zone `/app` apprenant
- Zone `/admin` formateur/admin
- Composants : `VideoPlayer`, `PdfViewer`, `QuizTimer`, `BlockEditor`

### Infrastructure

- Docker Compose prêt Hostinger
- Config Nginx + médias sécurisés
- Scripts / procédure de déploiement et backup

### Documentation

- Guide utilisateur formateur
- Guide apprenant (court)
- Spécifications (ce document + guides existants)

---

## Annexe A — Paramètres métier proposés (à valider)

| Paramètre | Proposition |
|-----------|-------------|
| Score quiz section | 50 % (non bloquant) |
| Score évaluation module | 60 % |
| Tentatives module | 2 |
| Délai après échec | 24 h |
| Durée évaluation 100 Q | 90 min |
| Section « terminée » | Vidéo vue ≥ 90 % |
| Progression | Linéaire module N → N+1 |
| Guide Master | Hors plateforme |

---

## Annexe B — Documents liés

| Document | Contenu |
|----------|---------|
| `explication.md` | Explication client (non technique) |
| `Guide_Technique_Client.md` | Choix techniques détaillés |
| `Fiche_Details_Fonctionnels.md` | Specs fonctionnelles / API |
| `Descriptif_Objectifs_et_Questions_Client.md` | Objectifs + questions cadrage |
| `Note_Preparation_Meeting_IAT_Academy.md` | Préparation meeting |
| `Note_Preparation_Meeting_IAT_Academy_Slides.md` | Version slides |

---

*Document de référence — Ensemble des détails de l'application IAT Academy (fonctionnel + technique). Toute décision client sur les paramètres métier met à jour l'Annexe A avant démarrage du développement.*
