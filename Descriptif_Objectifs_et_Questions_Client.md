# Descriptif des objectifs du projet — IAT Academy

**Plateforme e-learning**  
**Version :** 1.0  
**Date :** Juillet 2026

---

## 1. Contexte du projet

L'IAT Academy met en place une **plateforme de formation à distance** composée de **20 modules** couvrant l'ensemble des compétences visées par le programme. Le projet est actuellement en phase de **préparation et de développement des contenus pédagogiques**.

La plateforme a pour vocation de **diffuser** aux apprenants les contenus produits par l'équipe pédagogique (scripts, vidéos, quiz, évaluations) et de **piloter** leur progression jusqu'à l'obtention d'une **attestation de réussite**.

---

## 2. Objectifs du projet

### 2.1 Objectif principal

Mettre à disposition des apprenants une plateforme e-learning **structurée, progressive et certifiante**, permettant de suivre les 20 modules de formation, de valider les acquis à chaque étape et d'obtenir automatiquement une attestation à l'issue du parcours complet.

### 2.2 Objectifs pédagogiques

| Objectif | Description |
|----------|-------------|
| **Structurer le parcours** | Organiser la formation en 20 modules, chacun découpé en sections pédagogiques accessibles aux apprenants |
| **Diffuser les contenus** | Rendre disponibles pour chaque section : le contenu de formation, la vidéo pédagogique et un quiz d'évaluation |
| **Valider les acquis** | Permettre aux apprenants de s'évaluer en fin de section et de passer une évaluation finale de 100 questions à la fin de chaque module |
| **Garantir la progression** | Imposer un parcours linéaire : un module n'est accessible qu'après validation du module précédent |
| **Certifier l'achèvement** | Générer automatiquement une attestation de réussite après validation des 20 modules |

### 2.3 Objectifs fonctionnels (plateforme)

| Objectif | Description |
|----------|-------------|
| **Espace apprenant** | Consultation des modules, suivi de progression, passage des quiz et évaluations, téléchargement de l'attestation |
| **Espace formateur / admin** | Mise en ligne des contenus (texte, vidéo, quiz), organisation des modules et sections, paramétrage des évaluations |
| **Gestion des évaluations** | Quiz de section (formatif ou bloquant), évaluations fin de module (100 questions), règles de score, tentatives et durée |
| **Protection des contenus** | Accès réservé aux apprenants inscrits, vidéos et documents non partageables librement |
| **Attestation automatique** | Génération PDF dès que les 20 modules sont validés |

### 2.4 Objectifs techniques

| Objectif | Description |
|----------|-------------|
| **Fiabilité des évaluations** | Minuteur contrôlé côté serveur, randomisation des questions, limitation des tentatives |
| **Évolutivité** | Architecture permettant d'ajouter des modules, des formations ou des fonctionnalités ultérieures |
| **Simplicité de mise en ligne** | Interface permettant aux formateurs de publier contenus et quiz sans compétence technique avancée |
| **Hébergement sécurisé** | Stockage des vidéos et documents sur serveur sécurisé, accès par liens temporaires |

### 2.5 Périmètre exclu (à confirmer avec le client)

| Élément | Statut |
|---------|--------|
| **Guide Master** | Document interne — **hors plateforme**, pas de développement nécessaire |
| Production des vidéos (script → PowerPoint → vidéo) | Réalisée par l'équipe IAT Academy, hors périmètre technique |
| Rédaction des questions de quiz | Réalisée par l'équipe pédagogique, mise en ligne via la plateforme |

### 2.6 Critères de succès du projet

- Les 20 modules sont consultables par les apprenants selon les règles de progression définies
- Chaque section affiche contenu + vidéo + quiz comme prévu
- Les évaluations fin de module (100 questions) fonctionnent avec les règles validées (score, tentatives, durée)
- L'attestation est générée automatiquement après validation des 20 modules
- Les formateurs peuvent mettre en ligne et modifier les contenus via l'interface d'administration
- La plateforme est déployée, sécurisée et utilisable en conditions réelles

---

## 3. Questions à poser au client pour bien démarrer le projet

Les questions ci-dessous permettent de **cadrer le périmètre**, de **valider les règles métier** et d'**éviter les retours en arrière** pendant le développement. Elles sont organisées par thème.

---

### A. Structure et contenus pédagogiques

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| A1 | Combien de **sections pédagogiques** en moyenne par module ? | Dimensionner l'interface et estimer le volume de contenu |
| A2 | Le « contenu de formation » correspond-il au **texte du script** uniquement, ou inclut-il aussi des **PDF** ou **slides PowerPoint** ? | Définir les types de blocs à prévoir dans chaque section |
| A3 | Les slides PowerPoint restent-ils **accessibles en complément** de la vidéo, ou la vidéo suffit-elle seule ? | Éviter de sur-développer ou sous-développer l'affichage |
| A4 | Le **Guide Master** reste-t-il bien **hors plateforme** (document interne uniquement) ? | Confirmer qu'aucun développement n'est nécessaire pour ce document |
| A5 | Qui est responsable de la **production** des contenus (scripts, vidéos, questions) ? | Clarifier les rôles client vs prestataire |
| A6 | Qui sera chargé de la **mise en ligne** des contenus sur la plateforme ? | Définir le profil formateur / admin et la formation nécessaire |
| A7 | Y a-t-il un **ordre strict** des sections au sein d'un module, ou l'apprenant peut-il les parcourir librement ? | Règles de navigation et de progression |

---

### B. Quiz de fin de section

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| B1 | Le quiz de fin de section est-il **obligatoire** pour passer à la section suivante ? | Bloquant vs formatif — impact sur la progression |
| B2 | Quel **score minimum** pour valider un quiz de section ? (proposition : 50 %) | Paramétrage du moteur de quiz |
| B3 | Combien de **tentatives** autorisées par quiz de section ? | Règles anti-abus et pédagogie |
| B4 | La **correction** est-elle affichée immédiatement, différée ou jamais ? | Expérience apprenant et révision |
| B5 | Combien de **questions** en moyenne par quiz de section ? | Estimation du temps de passage |

---

### C. Évaluation finale de module (100 questions)

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| C1 | Les **100 questions** sont-elles **toutes posées** en une session, ou s'agit-il d'un **tirage aléatoire** dans une banque plus large ? | Architecture du moteur de quiz |
| C2 | Quel **score minimum** pour valider l'évaluation ? (proposition : 60 %) | Règle de déblocage du module suivant |
| C3 | Combien de **tentatives** autorisées ? (proposition : 2) | Gestion des échecs et reprises |
| C4 | Quel **délai d'attente** entre deux tentatives après un échec ? (proposition : 24 h) | Paramétrage anti-triche et pédagogie |
| C5 | Quelle **durée maximale** pour l'évaluation ? (proposition : 90 min pour 100 questions) | Minuteur serveur |
| C6 | La **correction** est-elle affichée après l'évaluation ? Si oui, immédiate ou différée ? | Expérience apprenant |
| C7 | Les questions sont-elles **mélangées** à chaque tentative ? | Randomisation — déjà prévue techniquement |
| C8 | Faut-il un **mélange des réponses** (ordre des choix) ? | Anti-mémorisation |

---

### D. Progression et déblocage

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| D1 | La progression est-elle **strictement linéaire** (module 1 → 2 → … → 20) ? | Règle centrale du parcours |
| D2 | Une section est-elle considérée comme « terminée » quand la **vidéo est vue** à X % ? (proposition : 90 %) | Suivi de progression |
| D3 | L'apprenant peut-il **revenir** sur une section déjà validée pour réviser ? | Mode relecture |
| D4 | Un **administrateur** peut-il débloquer manuellement un module pour un apprenant ? | Cas exceptionnels (défaillance technique, dispense) |

---

### E. Attestation de réussite

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| E1 | Quelles sont les **conditions exactes** pour obtenir l'attestation ? (20 modules validés uniquement ?) | Règle de génération automatique |
| E2 | Disposez-vous d'une **maquette** ou d'un **exemple** du document attendu (logo, texte, signature) ? | Design du PDF généré |
| E3 | Faut-il un **code de vérification** en ligne pour les tiers (employeurs, partenaires) ? | Page publique de vérification |
| E4 | Quelle est la différence attendue entre « **attestation de réussite** » et « **diplôme certifiant** » ? | Terminologie et contenu légal |
| E5 | L'attestation doit-elle mentionner les **scores** obtenus ou seulement la validation des modules ? | Contenu du document |

---

### F. Utilisateurs et accès

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| F1 | Comment les apprenants **s'inscrivent-ils** ? (inscription libre, liste fournie par l'école, import CSV ?) | Module inscription |
| F2 | L'**inscription / paiement en ligne** est-il dans le périmètre initial ou en phase ultérieure ? | Périmètre MVP |
| F3 | Quels **rôles** sont nécessaires ? (Admin, Formateur, Apprenant, Support ?) | Gestion des droits |
| F4 | Combien de **formateurs** utiliseront la plateforme ? | Dimensionnement et formation |
| F5 | Quelle est la **durée d'accès** après inscription ? (illimitée, 6 mois, 12 mois ?) | Règles d'accès |

---

### G. Périmètre complémentaire

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| G1 | Faut-il un **examen final global** en plus des 20 évaluations de module, ou l'attestation suffit-elle ? | Éviter de sur-développer |
| G2 | Des **quiz pratiques** (mises en situation) sont-ils prévus ? | Périmètre Phase 1 vs Phase 2 |
| G3 | Faut-il des **statistiques** pour les formateurs (taux de réussite, temps passé, etc.) ? | Tableaux de bord |
| G4 | **Multilingue** (FR / AR / EN) : nécessaire dès le lancement ou plus tard ? | Internationalisation |
| G5 | **Application mobile** ou accès web responsive suffisant ? | Choix technique frontend |

---

### H. Planning et déploiement

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| H1 | Quelle est la **date cible** de mise en ligne du **premier module** ? | Planning de développement |
| H2 | Le déploiement sera-t-il **progressif** (module par module) ou **complet** (20 modules d'un coup) ? | Stratégie de lancement |
| H3 | Quand le **premier lot de contenus** (module 1) sera-t-il prêt côté IAT Academy ? | Synchronisation contenu / technique |
| H4 | Y a-t-il une **date limite** pour la certification des premiers apprenants ? | Priorisation des livrables |
| H5 | Qui sera le **interlocuteur unique** côté client pour les validations ? | Organisation du projet |

---

### I. Hébergement et technique

| # | Question | Pourquoi c'est important |
|---|----------|--------------------------|
| I1 | Volume estimé de **vidéos** (durée moyenne par section, nombre total) ? | Dimensionnement stockage et bande passante |
| I2 | Nombre d'**apprenants** attendus la première année ? | Choix hébergement (VPS, cloud) |
| I3 | Préférence d'**hébergement** ? (serveur France, Maroc, autre ?) | Latence et conformité |
| I4 | Le client dispose-t-il d'un **nom de domaine** et d'une **charte graphique** ? | Branding de la plateforme |

---

## 4. Synthèse — Questions prioritaires pour le kick-off

Si le temps est limité, poser en priorité ces **15 questions** :

1. Nombre de sections par module ?
2. Formats exacts d'une section (texte, vidéo, PDF, slides) ?
3. Quiz de section : bloquant ou formatif ?
4. Les 100 questions : toutes posées ou tirage aléatoire ?
5. Score minimum évaluation module ? (proposition : 60 %)
6. Nombre de tentatives et délai après échec ?
7. Durée maximale évaluation 100 questions ?
8. Modèle de l'attestation + code de vérification ?
9. Inscription / paiement : dans le périmètre initial ?
10. Examen final global en plus des 20 × 100 questions ?
11. Qui met en ligne les contenus ?
12. Date du premier module prêt ?
13. Déploiement progressif ou complet ?
14. Guide Master confirmé hors plateforme ?
15. Interlocuteur unique côté client ?

---

## 5. Prochaine étape après les réponses

1. **Compte-rendu** des réponses validées par le client
2. **Mise à jour** des documents (`explication.md`, spécifications)
3. **Validation du périmètre** et du planning
4. **Démarrage** du développement sur base figée

---

*Document préparé pour le cadrage du projet IAT Academy — Juillet 2026*
