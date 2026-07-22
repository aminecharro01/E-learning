# Guide démo client — IAT Academy

**Objectif :** 10–15 minutes pour montrer le parcours apprenant + l’admin.  
**Date de la démo :** _______________

---

## URLs

| Service | URL |
|---------|-----|
| App (landing + auth) | http://localhost:3000 |
| Espace apprenant | http://localhost:3000/app |
| Admin | http://localhost:3000/admin |
| API / Swagger | http://localhost:8080/swagger-ui.html |

---

## Comptes démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** | `admin@iat-academy.local` | `Admin@123` |
| **Apprenant** | `apprenant@iat-academy.local` | `Apprenant@123` |
| Formateur (optionnel) | `formateur@iat-academy.local` | `Formateur@123` |

> Préférer **2 onglets** : un apprenant + un admin (fenêtres privées si besoin).

---

## Script démo recommandé (~12 min)

### 1. Landing (1 min)
1. Ouvrir http://localhost:3000  
2. Montrer l’identité visuelle Horizon (aviation), scroll rapide expertise / CTA.  
3. Cliquer **Se connecter**.

### 2. Parcours apprenant (5–6 min)
1. Login : `apprenant@iat-academy.local` / `Apprenant@123`  
2. **Dashboard** `/app` — progression, modules (ouverts vs cadenas).  
3. Ouvrir un **module débloqué** → leçon (vidéo / texte / PDF).  
4. Faire avancer la progression (marquer terminé ou regarder la vidéo).  
5. Lancer un **quiz fin de module** — minuteur, questions, soumission, score.  
6. Montrer que le **module suivant** se débloque après réussite (si déjà progressé en seed, expliquer la règle).  
7. Si dispo : **attestation / certificat** sur le dashboard (tous modules validés).

### 3. Espace admin (4–5 min)
1. Login admin : `admin@iat-academy.local` / `Admin@123`  
2. **Dashboard** — stats / vue d’ensemble.  
3. **Modules** → ouvrir le **studio** (éditeur de blocs TipTap, drag & drop).  
4. **Banque de quiz** — questions, paramètres (seuil, durée, tentatives).  
5. **Apprenants** — suivi de progression.  
6. **Médias** — upload (image / PDF / vidéo si fichier prêt).  
7. **Paramètres** — inscription, seuils (si exposés).  
8. Toggle **clair / sombre** dans le header.

### 4. Clôture (1 min)
- Rappeler : formation **2 ans**, **36 modules** (11 UF) ; contenu démo sur les premiers modules UF1–UF2 ; reste à renseigner avec l’école.  
- Activation compte : inscription → paiement → directeur active dans `/admin/users`.  
- Passer au fichier **CLIENT_QUESTIONS.md** / **PROGRAMME_2_ANS_ADAPTATION.md** pour les points encore ouverts.

---

## Ce qui est prêt vs à préciser

| Prêt (MVP) | À valider / à venir |
|------------|---------------------|
| Auth JWT (cookie), rôles | Mot de passe oublié (mailto pour l’instant) |
| Leçons multi-blocs + verrou édition | Contenu modules 6–20 |
| Quiz applicatif + fin de module | Quiz **pratique** + **final** (spec client) |
| Progression linéaire + attestation PDF | Page publique `/verify/{code}` |
| Admin studio + stats | Déploiement VPS Hostinger finalisé |
| UI Horizon light/dark (app) | CI / tests E2E |

---

## Si quelque chose plante

```bash
# 1. Bases
docker compose up -d postgres redis

# 2. Backend (terminal 1)
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"

# 3. Frontend (terminal 2)
cd frontend
npm run dev
```

- Port **5433** = Postgres Docker (pas 5432).  
- Port **8080** / **3000** déjà pris → fermer l’ancien process puis relancer.
