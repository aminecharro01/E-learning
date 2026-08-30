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

## Comptes démo (scénarios)

| Scénario | Email | Mot de passe | À montrer |
|----------|-------|--------------|-----------|
| **Super Admin** | `superadmin@iat-academy.local` | `SuperAdmin@123` | Réglages plateforme, thème, gestion des rôles Directeur |
| **Admin (Directeur)** | `admin@iat-academy.local` | `Admin@123` | Studio, users, validations |
| **Formateur** | `formateur@iat-academy.local` | `Formateur@123` | Vue staff / quiz aperçu |
| **UF1 en cours** | `apprenant@iat-academy.local` | `Apprenant@123` | Module 1 validé, Français en cours |
| **UF2 débloquée** | `amina.benali@demo.local` | `Demo@1234` | UF1 complète, animation démarrée |
| **Débutant** | `youssef.idrissi@demo.local` | `Demo@1234` | 1 section faite |
| **Zéro progression** | `lina.cherkaoui@demo.local` | `Demo@1234` | Compte payé, rien commencé |
| **Année 2 ouverte** | `salma.naji@demo.local` | `Demo@1234` | `year2` + UF5 validée |
| **Activation pending** | `karim.ouafi@demo.local` | `Demo@1234` | Paiement PENDING, compte désactivé |

> Préférer **2 onglets** : un apprenant + un admin (fenêtres privées si besoin).  
> Au démarrage API, la progression démo est **réinitialisée** (`app.demo.reset-progress-on-startup`, défaut `true`). Désactiver avec `DEMO_RESET_PROGRESS=false` si besoin.

---

## Script démo recommandé (~12 min)

### 1. Landing (1 min)
1. Ouvrir http://localhost:3000  
2. Montrer l’identité boarding-pass / charte IAT.  
3. Cliquer **Se connecter**.

### 2. Parcours apprenant — scénario principal (5–6 min)
1. Login : `apprenant@iat-academy.local` / `Apprenant@123`  
2. **Dashboard** `/app` — boarding-pass, UF1, modules ouverts vs cadenas.  
3. Ouvrir **Techniques de communication** (déjà validé) puis **Français** (en cours).  
4. Naviguer sidebar leçon ↔ leçon (shell stable).  
5. Lancer un **quiz** — options, timer, soumission.  
6. Option : reconnecter **Amina** pour montrer UF2 débloquée, ou **Salma** pour l’année 2.

### 3. Espace admin (4–5 min)
1. Login admin : `admin@iat-academy.local` / `Admin@123`  
2. **Apprenants** — comparer Nora / Amina / Lina / Karim (pending).  
3. **Modules** → studio TipTap.  
4. **Banque de quiz**.  
5. Toggle clair / sombre.

### 4. Clôture (1 min)
- Rappeler : formation **2 ans**, **36 modules** (11 UF) ; contenu riche sur UF1–UF2 début.  
- Activation : inscription → paiement → admin active (`Karim` = contre-exemple).  
- Points ouverts : **CLIENT_QUESTIONS.md** / **PROGRAMME_2_ANS_ADAPTATION.md**.

---

## À faire (rappel)

- [ ] **Newsletter — envoi d’emails** : aujourd’hui seules les inscriptions sont stockées (`newsletter_subscribers` + admin `/admin/leads`). Brancher l’envoi réel de campagnes (SMTP / provider type Mailchimp, Resend, etc.) pour diffuser les actualités aux abonnés actifs.

---

## Reset démo

```bash
# Postgres + Redis
docker compose up -d postgres redis

# Backend (reseed auto : nouveau marker catalogue + reset progression)
cd backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Purge manuelle SQL (si besoin) :

```sql
DELETE FROM lesson_progress;
DELETE FROM quiz_attempts;
DELETE FROM certificates;
DELETE FROM learner_uf_validations;
DELETE FROM learner_documents;
-- Forcer re-seed catalogue : supprimer les leçons puis redémarrer l’API
DELETE FROM lessons; -- (cascade via seeder clear — préférer redémarrage après wipe seeder)
```

---

## Si quelque chose plante

```bash
docker compose up -d postgres redis
cd backend && .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
cd frontend && npm run dev
```

- Port **5433** = Postgres Docker.  
- Ports **8080** / **3000** déjà pris → tuer l’ancien process.
