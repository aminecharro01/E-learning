# IAT Academy — Rapport complet & Guide d'utilisation

**Plateforme e-learning aviation/tourisme — formation en 2 ans**
Stack : Next.js (TypeScript) · Spring Boot (Java 17) · PostgreSQL · Redis · Bunny Stream

> Ce document décrit ce que l'application fait réellement aujourd'hui (état du code) et explique comment l'utiliser selon le rôle de chaque utilisateur.

---

## Table des matières

**Partie 1 — Rapport complet**
1. [Présentation générale](#1-présentation-générale)
2. [Structure pédagogique](#2-structure-pédagogique)
3. [Rôles et permissions](#3-rôles-et-permissions)
4. [Modules fonctionnels détaillés](#4-modules-fonctionnels-détaillés)

**Partie 2 — Guide d'utilisation par rôle**
5. [Super Admin](#5-super-admin)
6. [Admin (Directeur)](#6-admin-directeur)
7. [Formateur](#7-formateur)
8. [Apprenant (Étudiant)](#8-apprenant-étudiant)
9. [Support](#9-support)
10. [Cas particulier — tuteur de stage externe](#10-cas-particulier--tuteur-de-stage-externe)

---

# Partie 1 — Rapport complet

## 1. Présentation générale

IAT Academy est une plateforme de formation en ligne construite pour un parcours de **2 ans**, organisé en modules regroupés par Unité de Formation (UF). Elle couvre tout le cycle : consultation du contenu pédagogique (vidéo, PDF, image, texte), évaluation par quiz à plusieurs niveaux (section, module, UF, année), suivi de progression avec déblocage séquentiel, stage en entreprise avec validation externe, et délivrance automatique d'un certificat de réussite.

L'identité visuelle reprend un thème aviation (« boarding pass », navy/or) — vocabulaire et composants d'interface le reflètent (ex. « embarquement », icônes avion/tour de contrôle).

### Principe de fonctionnement

- Le contenu pédagogique (texte, vidéos, PDF, questions) est produit par l'équipe IAT Academy et publié via l'espace admin.
- L'apprenant progresse module par module, UF par UF ; l'accès au contenu suivant est verrouillé tant que le précédent n'est pas validé.
- Certaines étapes-clés (fin d'UF, fin d'année, unité de stage) nécessitent en plus une **validation manuelle du Directeur**, pas seulement la réussite d'un quiz.
- Un journal d'audit trace les actions sensibles de l'administration.

## 2. Structure pédagogique

```
Formation
 └─ Année (1 ou 2)
     └─ Unité de Formation — UF (étiquette portée par les modules, ex. « UF 3 — Environnement aéronautique »)
         └─ Module
             └─ Leçon (= « section »)
                 └─ Bloc de leçon (vidéo, PDF, image, ou texte riche)
```

**Point technique important :** l'UF et l'année ne sont *pas* des entités séparées avec leur propre identifiant — ce sont des étiquettes (`ufCode`/`ufTitle`, `yearNumber`) portées directement par chaque module. Cela garde le modèle de données simple tout en permettant un regroupement visuel et une logique de progression par UF/année.

Chaque **module** peut contenir plusieurs leçons, et chaque **leçon** est composée de blocs assemblés dans un éditeur type Notion (glisser-déposer, menu « / » pour insérer un bloc, barre d'outils flottante pour le formatage).

## 3. Rôles et permissions

| Rôle | Description | Accès |
|---|---|---|
| **SUPER_ADMIN** | Administrateur plateforme | Tout, y compris les réglages système réservés (thème, paramètres globaux) |
| **ADMIN** (Directeur) | Direction pédagogique | Tout sauf les réglages réservés Super Admin ; seul rôle à valider les UF, gérer les groupes, les campagnes email, les diplômes |
| **FORMATEUR** | Encadrement pédagogique | Studio de cours, quiz, correction manuelle, suivi apprenants, forums, messagerie — pas de gestion des utilisateurs ni des groupes |
| **ETUDIANT** (Apprenant) | Utilisateur final | Espace apprenant uniquement |
| **SUPPORT** | Assistance | Accès limité (selon configuration) |

`ADMIN` et `SUPER_ADMIN` héritent automatiquement de tous les droits `FORMATEUR` (hiérarchie de rôles côté sécurité) — un Directeur peut donc tout faire qu'un formateur peut faire, plus les fonctions réservées à son rôle.

## 4. Modules fonctionnels détaillés

### 4.1 Authentification & sécurité
- Connexion par email/mot de passe, session via cookie JWT `httpOnly` (pas de token exposé au JavaScript).
- **Double authentification (TOTP/2FA)** optionnelle par utilisateur (Google Authenticator ou équivalent).
- Inscription apprenant avec vérification d'email, mot de passe oublié / réinitialisation.
- Limitation de débit (rate limiting) sur les endpoints sensibles (connexion, etc.).
- Chaque rôle est vérifié à la fois côté interface (masquage de menus) et côté serveur (`@PreAuthorize` sur chaque endpoint) — la sécurité réelle est toujours appliquée côté backend.

### 4.2 Gestion du catalogue de cours
- Création/édition de **modules** (titre, description, année, code UF, ordre, publication).
- Création/édition de **leçons** au sein d'un module.
- **Éditeur de blocs** par leçon (« Studio ») : vidéo, PDF, image, texte riche (éditeur TipTap avec menu slash « / », barre d'outils flottante au survol du texte sélectionné, glisser-déposer pour réordonner les blocs).
- Aperçu apprenant directement depuis l'admin pour vérifier le rendu avant publication.
- Verrouillage d'édition collaboratif : si un formateur édite déjà une leçon, un bandeau avertit les autres pour éviter les conflits.

### 4.3 Système de quiz
**Quatre types de quiz**, chacun avec sa propre portée :

| Type | Rattaché à | Rôle |
|---|---|---|
| Quiz de section (`APPLICATIF`) | une leçon précise | vérifier la compréhension d'une section |
| Quiz de fin de module (`FIN_MODULE`) | un module | validation de fin de module |
| Quiz de fin d'UF (`FIN_UF`) | une Unité de Formation | validation de fin d'UF (en plus de la validation manuelle du Directeur) |
| Examen de fin d'année (`FIN_ANNEE`) | l'année 1 ou 2 | condition supplémentaire pour ouvrir l'année suivante |

**Types de questions** : choix unique, choix multiple, vrai/faux, réponse libre (essai — corrigée manuellement par un formateur, jamais automatiquement).

**Réglages par quiz** : score minimum de passage, nombre de tentatives max, durée limite, mélange des questions/options, délai entre tentatives, quiz « bloquant » (empêche de continuer tant qu'il n'est pas réussi), publication.

**Anti-triche (optionnel, désactivé par défaut, décision au cas par cas)** : détection de changement de fenêtre/perte de focus, blocage copier-coller, mode plein écran obligatoire — chaque évènement suspect est journalisé et consultable par l'admin/formateur.

**Banque de questions** : un pool de questions réutilisables, indépendant de tout quiz précis. Un quiz peut piocher aléatoirement N questions dans une banque (tirage à chaque tentative) plutôt que d'avoir une liste fixe.

**Import Excel** : import en masse de questions à choix (fichier `.xlsx`, colonnes Énoncé/Type/Options/Bonnes réponses) — les types plus complexes (réponse libre) restent créés à la main.

**Réordonnancement** : glisser-déposer des questions dans un quiz pour changer leur ordre d'apparition.

### 4.4 Gestionnaire de médias
Un vrai gestionnaire de fichiers pour toute la plateforme (page « Médias ») :
- **Dossiers** (créer, renommer, supprimer, organiser en arborescence).
- **Vidéos hébergées sur Bunny Stream** (lecteur professionnel avec qualité adaptative), tout le reste (PDF, images, documents) sur stockage disque.
- Glisser-déposer pour uploader directement dans le dossier ouvert, ou bouton d'upload classique.
- Vue grille ou liste, tri par nom/taille, sélection multiple avec actions groupées (déplacer/supprimer plusieurs fichiers à la fois).
- Aperçu intégré (lecteur vidéo, visionneuse PDF, image) sans quitter la page.
- Réservé à l'Admin/Super Admin pour la gestion (créer/renommer/supprimer/déplacer) ; le Formateur peut consulter et uploader mais pas réorganiser.

### 4.5 Progression et déblocage
- **Déblocage séquentiel par UF** : un module reste verrouillé tant que l'UF précédente n'est pas entièrement terminée (contenu + quiz de fin d'UF le cas échéant + validation manuelle du Directeur pour certaines UF sensibles comme le stage).
- **Ouverture de l'année 2** : automatique à une date paramétrable, à condition que l'année 1 soit entièrement terminée (toutes les UF + examen de fin d'année 1 le cas échéant).
- **Apprenants « groupe » (présentiel/hybride)** : pour les apprenants rattachés à un groupe, le déblocage n'est plus automatique — c'est le Directeur qui assigne le contenu accessible avec des dates précises (utile pour un rythme de classe encadré, différent du rythme individuel en ligne).

### 4.6 Stage & soutenance
- Dossier de stage par apprenant : dépôt de documents (convention, rapport, etc.).
- Validation d'UF spécifique au stage, effectuée par le Directeur.
- **Signature externe** : le tuteur de stage en entreprise (qui n'a pas de compte sur la plateforme) reçoit un lien unique, sécurisé et à usage unique (valide 7 jours) pour valider le stage sans avoir besoin de créer un compte.

### 4.7 Certificats
- Génération automatique d'un certificat PDF dès que le parcours complet est validé.
- Code de vérification unique par certificat, avec une page publique de vérification (permet à un tiers de confirmer l'authenticité sans se connecter).
- Suivi de remise physique du diplôme (remis en main propre ou non).

### 4.8 Devoirs, notes et correction
- **Gradebook** : suivi des notes/devoirs par apprenant.
- **Correction manuelle** : file d'attente des réponses libres (essais) en attente de correction par un formateur, avec notation et commentaire.

### 4.9 Communication
- **Messagerie / Forum** : un widget unique avec onglets Q&A et Forum par leçon (évite la redondance de deux widgets identiques).
- **Forums** (vue admin) : modération des discussions.
- **Contact & infolettre** : formulaire de contact public, inscriptions newsletter, consultables côté admin (« Contact & infolettre » / leads).
- **Campagnes email** : création et envoi de campagnes aux abonnés (réservé Admin).

### 4.10 Sessions live
Planification de sessions en direct (visioconférence) rattachées au parcours, avec rappel automatique aux apprenants concernés.

### 4.11 Notifications et gamification
- Notifications in-app : quiz corrigé, module terminé, UF validée, badge obtenu, contenu assigné, échéance de devoir proche, réponse sur le forum, note publiée, inactivité détectée, rappel de session.
- **Badges** : premier module terminé, quiz sans faute (100%), stage validé, profil complété, première participation au forum.

### 4.12 Analytics & tableau de bord admin
Vue d'ensemble pour le Directeur/Formateur : statistiques d'apprenants, progression globale, corrections en attente, messages non lus — avec un panneau « À faire » qui remonte les tâches prioritaires du jour.

### 4.13 Journal d'audit
Historique des actions sensibles d'administration (changement de rôle, activation/désactivation de compte, réinitialisation de mot de passe...), présenté sous forme de **timeline verticale** (entrées en alternance gauche/droite), réservé à l'Admin.

### 4.14 Paramètres système
Réglages globaux de la plateforme (valeurs par défaut des quiz, date d'ouverture année 2, activation Swagger, etc.) — réservés au **Super Admin** uniquement, distincts des décisions pédagogiques du Directeur.

### 4.15 Thème et apparence
Bascule clair/sombre disponible pour tous les utilisateurs, mémorisée par session.

---

# Partie 2 — Guide d'utilisation par rôle

## 5. Super Admin

Le Super Admin a accès à tout ce que voit l'Admin, plus une section réservée :

- **Paramètres** (`/admin/settings`) : seul rôle pouvant modifier les réglages globaux de la plateforme — valeurs par défaut des quiz (score minimum, tentatives, durée), date d'ouverture de l'année 2, options serveur.
- Gestion des rôles des autres comptes, y compris promouvoir/rétrograder un Admin.
- Tout le reste du guide « Admin (Directeur) » ci-dessous s'applique également.

**Quand l'utiliser** : configuration initiale de la plateforme, changements de politique globale, gestion des comptes à privilège élevé.

## 6. Admin (Directeur)

C'est le rôle de pilotage pédagogique principal.

### Construire le contenu
1. **Cours & modules** (`/admin/modules`) → créer un module (titre, année, code UF, description) → l'ouvrir pour ajouter des leçons.
2. Dans une leçon, ouvrir le **Studio** pour construire le contenu bloc par bloc (taper « / » pour insérer vidéo/PDF/image/texte, glisser pour réordonner).
3. Uploader les fichiers depuis **Médias** (`/admin/media`) ou directement depuis le studio — les vidéos partent automatiquement vers Bunny Stream.

### Créer des évaluations
1. **Quiz** (`/admin/quiz-bank`) → « Nouveau quiz » → choisir le type (section / fin de module / fin d'UF / fin d'année) → régler score minimum, tentatives, durée, anti-triche si besoin.
2. Ajouter les questions une par une, ou importer un fichier Excel pour les questions à choix, ou piocher dans une **banque de questions** existante (tirage aléatoire).
3. **Banques de questions** (`/admin/question-banks`) : constituer un pool de questions réutilisables sur plusieurs quiz.
4. **Correction manuelle** (`/admin/grading`) : corriger les réponses libres en attente.

### Suivre et valider
1. **Apprenants** (`/admin/learners`) : voir la progression individuelle, comparer plusieurs profils.
2. Valider une UF quand son contenu est terminé (notamment le stage) — nécessaire même si le quiz de fin d'UF est réussi.
3. **Stage & soutenance** (`/admin/stage`) : suivre les dossiers, envoyer une invitation de signature au tuteur externe.
4. **Devoirs & notes** (`/admin/gradebook`), **Forums** (`/admin/forum`), **Sessions live** (`/admin/sessions`) pour le suivi courant.
5. **Diplômes** (`/admin/diplomas`) : suivre la remise des certificats.

### Administrer
1. **Groupes (présentiel)** (`/admin/groups`) : créer des groupes d'apprenants hybrides, assigner le contenu accessible avec des dates de déverrouillage (rythme de classe).
2. **Utilisateurs** (`/admin/users`) : gérer les comptes, rôles, activation/désactivation.
3. **Contact & infolettre** (`/admin/leads`) et **Campagnes email** (`/admin/campaigns`) : suivre les demandes et communiquer avec les abonnés.
4. **Journal d'audit** (`/admin/audit-log`) : consulter l'historique des actions sensibles.

## 7. Formateur

Le Formateur a un accès pédagogique proche du Directeur, mais sans les fonctions de direction (pas de gestion des groupes, des utilisateurs, des campagnes email, des diplômes, ni du journal d'audit).

**Ce qu'il peut faire :**
- Créer/éditer des modules, leçons, contenu (Studio).
- Créer et gérer des quiz et des banques de questions.
- Corriger les réponses libres (**Correction manuelle**).
- Consulter et uploader dans **Médias** (sans réorganiser les dossiers).
- Suivre les **Apprenants**, le **Gradebook**, les **Forums**.
- Voir les **Sessions live** et l'**Analytics**.

**Ce qu'il ne peut pas faire :** gérer les groupes, les comptes utilisateurs, les campagnes email, les diplômes, ni consulter le journal d'audit — ces actions restent réservées au Directeur.

## 8. Apprenant (Étudiant)

### Démarrer
1. Se connecter, arriver sur le tableau de bord (`/app`) : vue « boarding pass » de la progression de l'année en cours, modules ouverts vs verrouillés par UF.

### Suivre un module
1. Ouvrir un module disponible → la barre latérale liste ses leçons et, en bas, le **quiz de fin d'UF** s'il y en a un pour cette UF.
2. Dans une leçon : lire/regarder le contenu, poser une question ou participer au forum (widget Q&A/Forum en bas de page).
3. Une leçon avec vidéo se marque automatiquement terminée après un certain pourcentage de visionnage ; une leçon texte se marque terminée manuellement.

### Passer un quiz
1. Ouvrir le quiz (section, fin de module, ou depuis le tableau de bord pour l'examen de fin d'année).
2. Répondre aux questions, minuteur visible si le quiz est chronométré.
3. Soumettre → résultat immédiat (score, réussi/à reprendre) sauf s'il contient des questions à réponse libre, corrigées manuellement.

### Suivre sa progression
- Le tableau de bord affiche le pourcentage de complétion de l'année en cours, la carte « reprendre où vous en étiez », et — une fois toutes les UF de l'année terminées — une carte pour passer l'**examen de fin d'année**.
- Notifications automatiques : quiz corrigé, badge obtenu, réponse à une question posée, etc.

### Autres pages
- **Stage** (`/app/stage`) : déposer les documents de stage une fois l'UF correspondante débloquée.
- **Devoirs** (`/app/assignments`) : voir les devoirs à rendre et les notes reçues.
- **Messages** (`/app/messages`) : messagerie/forum centralisés.
- **Profil** (`/app/profile`) : informations personnelles, avatar, mot de passe.

## 9. Support

Accès limité, dimensionné pour l'assistance aux utilisateurs (selon la configuration des droits en place) — typiquement en lecture sur les comptes et échanges, sans les fonctions de création de contenu pédagogique du Directeur/Formateur.

## 10. Cas particulier — tuteur de stage externe

Le tuteur en entreprise n'a pas de compte sur la plateforme. Le Directeur lui envoie un lien unique depuis **Stage & soutenance** ; ce lien reste valide 7 jours et ne peut servir qu'une seule fois, pour valider (ou non) le stage d'un apprenant précis — sans inscription ni mot de passe.

---

*Document généré à partir de l'état réel du code de l'application (backend Spring Boot + frontend Next.js).*
