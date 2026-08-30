# Note de préparation — Meeting IAT Academy

**Date du meeting :** demain  
**Objectif :** aligner le descriptif pédagogique client avec la plateforme technique prévue  
**Documents de référence :** `explication.md`, `Guide_Technique_Client.md`

---

## 1. Message à retenir (30 secondes)

La plateforme que nous proposons **correspond au descriptif IAT Academy** : 20 modules, sections avec contenu + vidéo + quiz, évaluation finale par module, attestation automatique à la fin du parcours. Notre rôle technique est de **recevoir et diffuser** les contenus produits par l'équipe pédagogique (scripts, PowerPoint, vidéos, questions).

---

## 2. Correspondance vocabulaire

| IAT Academy (client) | Plateforme (technique) | Commentaire |
|----------------------|------------------------|-------------|
| Module (×20) | Module | Parcours linéaire, déblocage progressif |
| Section pédagogique | Leçon | Unité visible par l'apprenant |
| Contenu de formation | Bloc texte (+ PDF/slides si besoin) | Issu du script |
| Vidéo pédagogique | Bloc vidéo | Principale support visuel |
| Quiz de fin de section | Quiz formatif | À valider : bloquant ou non ? |
| Évaluation finale (100 Q) | Quiz fin de module | Obligatoire pour débloquer le module suivant |
| Attestation de réussite | Certificat PDF auto-généré | Après validation des 20 modules |
| Guide Master | **Hors plateforme** | Document interne — pas de développement |

---

## 3. Workflow pédagogique (côté client) vs plateforme

```
CÔTÉ IAT ACADEMY (production)          CÔTÉ PLATEFORME (diffusion)
─────────────────────────────          ─────────────────────────────
Guide Master (interne)          →      Non publié
Découpage en sections           →      Création des leçons par module
Script par section              →      Bloc texte (contenu)
PowerPoint                      →      Optionnel : slides/PDF en complément
Vidéo depuis le PPT             →      Bloc vidéo (support principal)
Questions section               →      Quiz de fin de section
Banque 100 questions / module   →      Quiz fin de module
Validation des 20 modules       →      Génération attestation PDF
```

---

## 4. Agenda proposé (45–60 min)

| # | Sujet | Durée | Objectif |
|---|-------|-------|----------|
| 1 | Reformulation du besoin | 5 min | Confirmer qu'on a bien compris les 20 modules |
| 2 | Structure d'une section | 10 min | Contenu + vidéo + quiz : formats et ordre |
| 3 | Règles de progression | 10 min | Que bloque quoi ? (section vs module) |
| 4 | Évaluations | 15 min | 100 questions : règles, score, tentatives, durée |
| 5 | Attestation | 5 min | Contenu du document, vérification en ligne |
| 6 | Rôles et mise en ligne | 5 min | Qui crée/publie les contenus ? |
| 7 | Planning | 5 min | Premier module prêt quand ? déploiement progressif ? |
| 8 | Points hors descriptif | 5 min | Paiement, inscription, examen global, etc. |

---

## 5. Questions prioritaires à poser

### Structure et contenus

- Combien de **sections** en moyenne par module ?
- Le « contenu de formation » = **texte du script** uniquement, ou aussi PDF / slides PowerPoint ?
- Les slides restent-ils accessibles **en plus** de la vidéo, ou la vidéo suffit-elle ?
- Le **Guide Master** reste bien **hors plateforme** ? (confirmer)

### Quiz de section

- Le quiz de fin de section est-il **obligatoire** pour passer à la section suivante ?
- Score minimum ? Nombre de tentatives ? Correction affichée ?

### Évaluation finale module (100 questions)

- Les **100 questions** sont-elles toutes posées en une session, ou un **tirage aléatoire** dans une banque plus large ?
- Score de passage ? (proposition : 60 %)
- Nombre de tentatives ? Délai entre tentatives ?
- Durée maximale ? (100 questions → probablement 60–90 min)
- Affichage de la correction après l'examen ?

### Attestation

- Modèle ou exemple du document attendu (logo, texte, signature) ?
- **Code de vérification** en ligne pour les tiers (employeurs, etc.) ?
- Différence attendue entre « attestation de réussite » et « diplôme certifiant » ?

### Périmètre complémentaire

- **Inscription / paiement** en ligne : dans le périmètre ?
- **Examen final global** en plus des 20 × 100 questions, ou l'attestation suffit après les 20 modules ?
- **Quiz pratique** (mises en situation) : prévu ou non ?

### Planning

- Date cible de **mise en ligne** du premier module ?
- Déploiement **module par module** ou lancement complet des 20 ?

---

## 6. Propositions à présenter (si le client n'a pas d'avis)

| Paramètre | Proposition | À valider |
|-----------|-------------|-----------|
| Score minimum — quiz section | 50 %, non bloquant (entraînement) | ☐ |
| Score minimum — évaluation module | 60 % | ☐ |
| Tentatives — évaluation module | 2 | ☐ |
| Délai après échec | 24 h | ☐ |
| Durée — évaluation 100 Q | 90 min | ☐ |
| Progression | Linéaire : module N+1 après validation module N | ☐ |
| Attestation | PDF auto + code de vérification | ☐ |
| Guide Master | Hors plateforme | ☐ |

---

## 7. Points forts à mettre en avant

- **Parcours progressif** : impossible de sauter un module non validé
- **Vidéos protégées** : accès réservé aux apprenants inscrits, liens temporaires
- **Quiz fiables** : minuteur côté serveur, questions mélangées à chaque tentative
- **Interface formateur** : mise en ligne des vidéos, textes et quiz sans compétence technique
- **Attestation automatique** : générée dès que les 20 modules sont validés
- **Évolutif** : possibilité d'ajouter des modules ou des formations ultérieurement

---

## 8. Après le meeting — actions

| Action | Responsable |
|--------|-------------|
| Compte-rendu des décisions prises | Vous |
| Mise à jour `explication.md` si règles validées | Vous / dev |
| Maquette attestation (si fournie par client) | Client |
| Planning module 1 + calendrier dev | Ensemble |
| Devis / périmètre ajusté si périmètre élargi (paiement, etc.) | Vous |

---

*Document interne — préparation meeting IAT Academy — Juillet 2026*
