# Explication de la plateforme — Document pour le client

**IAT Academy — Plateforme e-learning**  
**Version :** 1.1  
**Date :** Juillet 2026

> Ce document explique **comment l'application va fonctionner**, sans termes techniques.  
> Il sert à valider ensemble le projet avant le développement, sur la base du descriptif IAT Academy.

---

## 1. En une phrase : c'est quoi ?

Une **plateforme de formation en ligne** où les apprenants suivent un parcours structuré en **20 modules**, consultent les contenus et vidéos de chaque section, passent des quiz d'évaluation, et reçoivent une **attestation de réussite** à la fin du parcours.

Le parcours est **progressif** : chaque module doit être validé avant d'accéder au suivant.

---

## 2. Qui utilise la plateforme ?

| Profil | Rôle en langage simple |
|--------|------------------------|
| **Administrateur** | Dirige la plateforme : inscriptions, statistiques, attestations |
| **Formateur / Concepteur** | Met en ligne les contenus, vidéos et quiz produits par l'équipe pédagogique |
| **Apprenant** | Suit les modules, passe les évaluations, obtient son attestation |
| **Support** *(optionnel)* | Répond aux questions des apprenants |

Chaque personne se connecte avec son compte et voit **un espace adapté à son rôle**.

> **Note :** le **Guide Master** (manuel de référence interne) reste un document de travail pour les concepteurs et formateurs. Il **ne sera pas visible** sur la plateforme par les apprenants.

---

## 3. Comment est organisée la formation ?

La formation IAT Academy comprend **20 modules**. Chaque module contient des **sections pédagogiques** :

```
Formation IAT Academy (20 modules)
    │
    ├── Module 1
    │       ├── Section 1 — contenu + vidéo + quiz ☆
    │       ├── Section 2 — contenu + vidéo + quiz ☆
    │       ├── Section 3…
    │       └── Évaluation finale du module (100 questions) ★
    │
    ├── Module 2
    │       ├── Sections…
    │       └── Évaluation finale (100 questions) ★
    │
    ├── … Modules 3 à 19 …
    │
    ├── Module 20
    │       ├── Sections…
    │       └── Évaluation finale (100 questions) ★
    │
    └── Attestation de réussite (PDF automatique)
```

☆ = quiz de fin de section (validation des acquis)  
★ = évaluation obligatoire pour débloquer le module suivant

**Correspondance technique :** une « section pédagogique » correspond à une **leçon** dans la plateforme.

---

## 4. Production des contenus (côté IAT Academy) vs plateforme

Votre équipe pédagogique suit un processus structuré. La plateforme intervient **à la fin** de ce processus, pour diffuser les contenus aux apprenants :

| Étape (équipe pédagogique) | Sur la plateforme ? |
|----------------------------|---------------------|
| Guide Master (manuel de référence) | **Non** — document interne |
| Découpage en sections | Oui — organisation des leçons |
| Script détaillé par section | Oui — contenu texte de la section |
| Présentation PowerPoint | Optionnel — slides ou PDF en complément |
| Vidéo pédagogique (depuis le PPT) | **Oui** — support visuel principal |
| Quiz de fin de section | Oui |
| Évaluation finale (100 questions) | Oui |

---

## 5. À quoi ressemble une section pour l'apprenant ?

Chaque section pédagogique comprend :

| Élément | Ce que voit l'apprenant |
|---------|-------------------------|
| **Contenu de formation** | Texte structuré (issu du script) |
| **Vidéo pédagogique** | Lecteur avec pause, reprise, vitesse de lecture |
| **Quiz d'évaluation** | Questions en fin de section pour valider les acquis |

En complément, le formateur peut ajouter :

| Élément optionnel | Usage |
|-------------------|-------|
| **PDF** | Document de référence affiché dans la page |
| **Slides** | Présentation PowerPoint exportée (PDF ou images) |
| **Image** | Schéma, illustration |

**Exemple concret — Section « Introduction au module 3 » :**
1. Texte de formation (points clés du script)
2. Vidéo pédagogique de 8 minutes
3. Quiz de 5 à 10 questions

Le formateur peut **réorganiser** ces éléments par glisser-déposer dans l'interface d'administration.

---

## 6. Comment le formateur met en ligne une section ?

1. Il ouvre l'espace **administration**
2. Il choisit le module et la section (leçon)
3. Il ajoute les éléments : texte, vidéo, quiz, éventuellement PDF ou slides
4. Il réordonne les éléments si besoin
5. Il enregistre et **publie** la section

**Règle importante :** si un formateur modifie déjà une section, un autre verra un message du type *« Cette leçon est en cours d'édition par [Nom] »* — pas d'édition simultanée sur le même contenu.

---

## 7. Parcours de l'apprenant — étape par étape

### Accès
1. L'apprenant crée son compte (email)
2. Il accède à son **tableau de bord**
3. *(Optionnel — à valider :)* paiement en ligne avant accès aux modules

### Suivi des modules
4. Il voit sa **progression globale** (ex. « Module 7 / 20 »)
5. Le **module en cours** est mis en avant
6. Les modules **pas encore débloqués** apparaissent avec un cadenas
7. Il suit les sections une par une (contenu, vidéo)
8. La plateforme **retient où il s'est arrêté** (reprise de la vidéo, etc.)

### Évaluations
9. En fin de chaque section : **quiz** pour valider les acquis
10. En fin de chaque module : **évaluation de 100 questions** — score minimum à définir
11. Si réussi → le **module suivant se débloque**
12. Si échoué → nouvelle tentative possible (nombre limité, à valider)
13. Après validation des **20 modules** : **attestation de réussite** générée automatiquement

---

## 8. Comment fonctionnent les évaluations ?

### Types d'évaluations

| Type | Quand ? | Bloque la suite ? |
|------|---------|-------------------|
| Quiz de fin de section | Après chaque section | **À valider** avec le client |
| Évaluation fin de module | Après toutes les sections du module | **Oui** — 100 questions |
| Attestation | Après les 20 modules validés | — |

### Types de questions (version de départ)

- Choix unique (une seule bonne réponse)
- Choix multiple (plusieurs bonnes réponses)
- Vrai / Faux

### Ce que voit l'apprenant pendant l'évaluation

- Un **chrono** visible à l'écran
- Navigation entre les questions
- Indicateur « Question 12 sur 100 »
- Score minimum affiché (ex. « Il faut 60 % pour réussir »)
- À la fin : résultat immédiat (correction : à valider)

### Règles intégrées

- Le **temps est contrôlé par le serveur** — pas par l'horloge de l'ordinateur
- Les **questions peuvent être mélangées** à chaque tentative
- Le nombre de **tentatives est limité** (paramétrable)
- Un **délai d'attente** peut être imposé entre deux tentatives après un échec

### Déblocage du module suivant

Le module suivant reste **verrouillé** tant que :
- toutes les sections du module actuel ne sont pas terminées, **et**
- l'évaluation finale du module n'est pas réussie (score ≥ le minimum défini)

---

## 9. Protection des contenus (vidéos, PDF)

Les supports pédagogiques sont protégés ainsi :

| Protection | Explication simple |
|------------|-------------------|
| Accès réservé aux inscrits | Seuls les apprenants connectés voient le contenu |
| Liens temporaires | Les vidéos ne sont pas partageables via un lien permanent |
| Modules verrouillés | Impossible d'accéder au module 3 sans avoir validé le module 2 |

---

## 10. L'attestation de réussite

Quand l'apprenant a validé **les 20 modules** (évaluations finales réussies), la plateforme génère automatiquement une **attestation de réussite en PDF**.

Chaque attestation peut comporter un **code unique** vérifiable en ligne (à valider avec le client).

---

## 11. Ce qui est inclus maintenant vs plus tard

### Inclus dans la première version

- Connexion, espace apprenant et administration
- 20 modules avec déblocage progressif
- Sections : contenu texte + vidéo + quiz
- Éditeur pour le formateur (ajout, réorganisation des éléments)
- Évaluations fin de module (100 questions, paramétrables)
- Minuteur fiable, tentatives limitées, questions mélangées
- Suivi de progression apprenant
- Attestation PDF automatique
- Guide Master **hors plateforme** (aucun développement nécessaire)

### Prévu dans une phase ultérieure (si souhaité)

- Inscription et paiement en ligne
- Questions avancées (association, mises en situation)
- Surveillance examen (webcam, anti-onglet)
- Statistiques avancées
- Multilingue (FR / AR / EN)
- Application mobile

---

## 12. Points à valider ensemble (meeting)

Les valeurs ci-dessous sont des **propositions** — à confirmer lors du meeting.

### A. Évaluations

| # | Question | Proposition | Votre choix |
|---|----------|-------------|-------------|
| A1 | Score minimum — évaluation fin de module (100 Q) | 60 % | ☐ OK  ☐ Autre : _____ |
| A2 | Nombre de tentatives — fin de module | 2 | ☐ OK  ☐ Autre : _____ |
| A3 | Délai après un échec | 24 heures | ☐ OK  ☐ Autre : _____ |
| A4 | Durée maximale — évaluation 100 questions | 90 minutes | ☐ OK  ☐ Autre : _____ |
| A5 | Les 100 questions : toutes posées ou tirage aléatoire ? | À définir | ☐ Toutes  ☐ Tirage  ☐ Autre |
| A6 | Quiz de fin de section : bloque la section suivante ? | Non (formatif) | ☐ OK  ☐ Oui |
| A7 | Afficher la correction après l'examen ? | Oui | ☐ Oui  ☐ Non  ☐ Différé |

### B. Contenus

| # | Question | Proposition | Votre choix |
|---|----------|-------------|-------------|
| B1 | Slides PowerPoint visibles en plus de la vidéo ? | Optionnel | ☐ Oui  ☐ Non  ☐ Par section |
| B2 | Téléchargement des PDF par l'apprenant | Non | ☐ OK  ☐ Autoriser |
| B3 | Nombre moyen de sections par module | À préciser | _____ |

### C. Attestation

| # | Question | Proposition | Votre choix |
|---|----------|-------------|-------------|
| C1 | Génération automatique après 20 modules | Oui | ☐ OK  ☐ Modifier |
| C2 | Code de vérification en ligne | Oui | ☐ Oui  ☐ Non |
| C3 | Modèle / maquette du document | À fournir par IAT Academy | ☐ |

### D. Périmètre complémentaire

| # | Question | Proposition | Votre choix |
|---|----------|-------------|-------------|
| D1 | Inscription / paiement en ligne | Hors périmètre initial | ☐ Inclus  ☐ Plus tard |
| D2 | Examen final global (en plus des 20 × 100 Q) | Non — attestation suffit | ☐ OK  ☐ Oui, examen global |
| D3 | Déploiement des modules | Progressif (module par module) | ☐ Progressif  ☐ Big bang |

---

## 13. Résumé visuel — parcours apprenant

```
  ACCÈS              SUIVI DES MODULES          ÉVALUATIONS           ATTESTATION
     │                      │                       │                      │
     ▼                      ▼                       ▼                      ▼
┌─────────┐          ┌─────────────┐          ┌───────────┐         ┌──────────┐
│ Créer   │          │ Module 1    │          │ Quiz fin  │         │ 20       │
│ compte  │─────────▶│ Sections    │─────────▶│ module    │──…───▶│ modules  │
│         │          │ contenu +   │          │ 100 Q ★   │         │ validés  │
└─────────┘          │ vidéo + quiz│          └───────────┘         │ → PDF    │
                     └─────────────┘               │                  └──────────┘
                           │                       │ échec → retente
                           ▼                       ▼
                     Module 2 débloqué       Attente (ex. 24 h)
                     si évaluation réussie
```

---

## 14. Prochaine étape

1. **Meeting de validation** — confirmer les points de la section 12.
2. **Fournir une maquette** de l'attestation de réussite (si disponible).
3. **Indiquer la date** du premier module prêt pour mise en ligne.
4. Une fois validé, le développement démarre sur cette base.

**Documents complémentaires :**
- `Note_Preparation_Meeting_IAT_Academy.md` — synthèse pour le meeting
- `Guide_Technique_Client.md` — détails techniques
- `Fiche_Details_Fonctionnels.md` — spécifications détaillées

---

*Document adapté au descriptif IAT Academy (20 modules, sections pédagogiques, attestation de réussite). Toute modification demandée sera intégrée avant le démarrage du développement.*
