# Adaptation projet — Formation IAT Academy (2 ans)

**Date cadrage client :** juillet 2026  
**Statut :** décisions client validées — adaptation technique en cours  
**Formation :** Hôtesse / Steward / Tourisme & Aéronautique — cycle **2 années**

---

## 1. Décisions client (réunion)


| #   | Décision                                                            | Impact produit                                         |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | La formation dure **2 ans**                                         | Remplace le modèle « 20 modules plats »                |
| 2   | Après **inscription + paiement**, le **directeur** active le compte | Compte créé `enabled = false` jusqu’à activation admin |
| 3   | L’activation donne l’accès aux cours                                | Pas d’accès `/app` tant que non activé                 |
| 4   | Structure **Année → Unité de Formation (UF) → Modules**             | Nouvelle hiérarchie pédagogique                        |
| 5   | L’apprenant a un **profil** avec ses informations                   | Page profil + champs étendus                           |
| 6   | Déblocage **par UF** (pas module par module)                        | Tous les modules d’une UF ouverte sont accessibles     |
| 7   | Année 2 : auto après UF 5, **reportée** à l’année scolaire suivante | Flag `year2AccessEnabled` (directeur / rentrée)        |
| 8   | **Un seul diplôme**, remis **physiquement** à l’école               | Pas de diplôme année 1 ; PDF optionnel archive école   |
| 9   | Stage / soutenance = **espace documents** (directeur + apprenant)   | Dépôts convention, assurance, rapport, présentation    |
| 10  | Paiement **hors plateforme** (mensuel / trimestre / année)          | Suivi paiement léger ou hors système                   |
| 11  | **Pas de codes** modules à l’écran — **titres uniquement**          | UI sans `1-1`, `6-1`, etc.                             |


---

## 2. Nouvelle hiérarchie (cible)

```
Formation (1 parcours certifiant, 2 ans)
 └── Année 1 | Année 2
      └── Unité de Formation (UF 1 … UF 11)
           └── Module (ex. 1-1 Techniques de communication)
                └── Leçons → Blocs (vidéo, texte, PDF, image)
                └── Quiz (applicatif / fin de module)
```

### Avant (MVP actuel)

```
Formation → 20 modules génériques (« Module 1 » … « Module 20 »)
```

### Après (aligné client)

```
Formation → 36 modules nommés, groupés en 11 UF sur 2 années
```


| Année     | UF           | Nb modules     |
| --------- | ------------ | -------------- |
| 1ère      | UF 1 → UF 5  | 18             |
| 2ème      | UF 6 → UF 11 | 18             |
| **Total** | **11 UF**    | **36 modules** |


---

## 3. Programme officiel

### 1ère Année

#### UF 1 — Langues et communication


| Code | Intitulé                    |
| ---- | --------------------------- |
| 1-1  | Techniques de communication |
| 1-2  | Français                    |
| 1-3  | Anglais                     |
| 1-4  | Comportement et attitude    |


#### UF 2 — Exploitation touristique et aéroportuaire


| Code | Intitulé                      |
| ---- | ----------------------------- |
| 2-1  | Techniques d’animation        |
| 2-2  | Accueil et réception          |
| 2-3  | Exploitation des aéroports    |
| 2-4  | Techniques d’agence de voyage |


#### UF 3 — Environnement aéronautique


| Code | Intitulé                                                          |
| ---- | ----------------------------------------------------------------- |
| 3-1  | Connaissances aéronautiques (Français)                            |
| 3-2  | Connaissances aéronautiques (Anglais)                             |
| 3-3  | Réglementation (droit aérien, marchandises dangereuses et sûreté) |
| 3-4  | Connaissances de base en secourisme                               |


#### UF 4 — Connaissances générales complémentaires


| Code | Intitulé                                                  |
| ---- | --------------------------------------------------------- |
| 4-1  | Marketing touristique et gestion commerciale              |
| 4-2  | Législation générale et spécifique (généralité et F/ PNC) |
| 4-3  | Economie et sociologie du Tourisme                        |
| 4-4  | Géographie touristique                                    |


#### UF 5 — Stage en milieu réel


| Code | Intitulé             |
| ---- | -------------------- |
| 5-1  | Stage en milieu réel |
| 5-2  | Rapport de stage     |


---

### 2ème Année

#### UF 6 — Techniques d’expression


| Code | Intitulé               |
| ---- | ---------------------- |
| 6.1  | Français (touristique) |
| 6.2  | Anglais (touristique)  |
| 6.3  | Espagnol               |
| 6-4  | Anglais technique      |


> Note codes : le client a fourni un mix `6.1` / `6-4`. **Normalisation technique proposée :** `6-1`, `6-2`, `6-3`, `6-4` (même logique pour UF 7–11).

#### UF 7 — Gestion et exploitation touristiques


| Code | Intitulé                            |
| ---- | ----------------------------------- |
| 7-1  | Guidage et accompagnement           |
| 7-2  | Restauration et hygiène             |
| 7-3  | Technique d’annonce et d’assistance |
| 7-4  | Technique d’animation               |


#### UF 8 — Exploitation aéronautique


| Code | Intitulé                        |
| ---- | ------------------------------- |
| 8-1  | Sécurité dans les avions        |
| 8-2  | Safety and first aid            |
| 8-3  | Sauvetage et secourisme         |
| 8-4  | CRM (crew ressource management) |


#### UF 9 — Connaissances et outils de gestion


| Code | Intitulé                                     |
| ---- | -------------------------------------------- |
| 9-1  | Applications informatiques et bureautiques   |
| 9-2  | Techniques de vente                          |
| 9-3  | Monde contemporain, histoire et civilisation |


#### UF 10 — Culture d’entreprise


| Code | Intitulé              |
| ---- | --------------------- |
| 10-1 | Recherche d’emploi    |
| 10-2 | Création d’entreprise |


#### UF 11 — Travaux de synthèse


| Code | Intitulé   |
| ---- | ---------- |
| 11-1 | Soutenance |


---

## 4. Parcours inscription → accès cours

```
1. Apprenant s’inscrit (landing /register)
        ↓
2. Compte créé : rôle ETUDIANT, enabled = FALSE
   Message : « Votre compte est en attente d’activation par l’académie »
        ↓
3. Paiement des frais (hors plateforme V1 — suivi manuel / admin)
        ↓
4. Directeur (ADMIN) active le compte dans /admin/users ou /admin/learners
        ↓
5. Apprenant peut se connecter et accéder à /app (**Année 1 — UF 1**, tous ses modules)
```

### Règles d’accès


| État                           | Login                       | Accès cours                                                       |
| ------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| Inscrit, non payé / non activé | ❌ refusé (`enabled=false`) | ❌                                                                 |
| Activé par directeur           | ✅                           | ✅ **Année 1**, UF 1 ouverte (tous ses modules)                  |
| UF N terminée                  | ✅                           | ✅ UF N+1 s’ouvre (même année scolaire)                          |
| Année 1 (UF 5) terminée        | ✅                           | ⏳ Année 2 **verrouillée** jusqu’à la rentrée suivante           |
| Directeur ouvre l’année 2      | ✅                           | ✅ UF 6 et suite (toujours par UF)                               |


---

## 5. Profil apprenant

Page cible : `/app/profile`


| Champ                  | Obligatoire inscription | Éditable par apprenant | Visible admin |
| ---------------------- | ----------------------- | ---------------------- | ------------- |
| Nom complet            | ✅                       | ✅                      | ✅             |
| Email                  | ✅                       | ❌ (ou via admin)       | ✅             |
| Mot de passe           | ✅                       | ✅ (change-password)    | reset admin   |
| Téléphone              | recommandé              | ✅                      | ✅             |
| CIN / pièce d’identité | recommandé              | ✅                      | ✅             |
| Date de naissance      | optionnel               | ✅                      | ✅             |
| Adresse                | optionnel               | ✅                      | ✅             |
| Année d’inscription    | admin                   | ❌                      | ✅             |
| Statut paiement        | admin                   | ❌                      | ✅             |
| Compte activé          | admin                   | ❌                      | ✅             |
| Date d’activation      | système                 | ❌                      | ✅             |


---

## 6. Mapping technique (ancien → nouveau)


| Élément actuel                   | Adaptation                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------- |
| 20 modules `Module N`            | **36 modules** avec `code` + intitulé officiel                                    |
| `modules.formation_id` seul      | + `year_number`, `uf_code`, `uf_title`, `code`                                    |
| Progression module → module      | Progression **UF → UF** (tous modules d’une UF ouverts ensemble)                  |
| Attestation 20 modules           | **Un seul diplôme** fin cycle, remis **physiquement** à l’école                   |
| `register` → `enabled=true`      | `register` → `enabled=false`                                                      |
| Pas de profil apprenant          | `/app/profile` + champs user étendus                                              |
| Codes modules affichés           | **Titres uniquement** (codes gardés en BDD pour admin/technique)                  |
| Demo 5 modules riches            | Contenu démo sur premiers modules UF 1–2                                          |


### Ordre pédagogique (`order_index`)


| order_index | Code        | Année | UF    |
| ----------- | ----------- | ----- | ----- |
| 0–3         | 1-1 … 1-4   | 1     | UF 1  |
| 4–7         | 2-1 … 2-4   | 1     | UF 2  |
| 8–11        | 3-1 … 3-4   | 1     | UF 3  |
| 12–15       | 4-1 … 4-4   | 1     | UF 4  |
| 16–17       | 5-1 … 5-2   | 1     | UF 5  |
| 18–21       | 6-1 … 6-4   | 2     | UF 6  |
| 22–25       | 7-1 … 7-4   | 2     | UF 7  |
| 26–29       | 8-1 … 8-4   | 2     | UF 8  |
| 30–32       | 9-1 … 9-3   | 2     | UF 9  |
| 33–34       | 10-1 … 10-2 | 2     | UF 10 |
| 35          | 11-1        | 2     | UF 11 |


---

## 7. Décisions validées (réponses client)

| # | Sujet | Décision client | Règle produit |
|---|--------|-----------------|---------------|
| 1 | Déblocage **année 2** | Automatique **après UF 5**, mais accès **reporté à la prochaine année scolaire** (pas la même année) | Fin UF 5 ≠ ouverture UF 6. Le directeur (ou la rentrée) active `year2AccessEnabled` pour la cohorte / l’apprenant. |
| 2 | Attestation / diplôme | **Une seule** attestation, **remise physiquement à l’école** | Pas de diplôme partiel année 1. PDF plateforme = archive / impression école (optionnel), remise officielle hors ligne. |
| 3 | Stage (UF 5) & soutenance (UF 11) | **Espace documents** dédié | **Directeur** dépose : convention de stage (signée électroniquement) + assurance. **Apprenant** dépose : convention après signature entreprise, rapport de stage, présentation numérique. |
| 4 | Paiement | **Hors système** ; périodicité mensuelle / trimestre / année | Pas de passerelle de paiement. Activation compte reste manuelle après contrôle admin. |
| 5 | Accès dans une année | **Linéaire par Unité de Formation** | À l’ouverture d’une UF : **tous ses modules** sont accessibles. Après validation de **tous** les modules de l’UF → UF suivante. |
| 6 | Codes modules (`1-1`, `6.1`…) | **Ne pas les utiliser** à l’écran | Afficher uniquement les **intitulés**. Codes éventuels en BDD uniquement (technique / admin). |

### 7.1 Progression — détail

```
Activation compte
  → Année 1 / UF 1 ouverte (tous modules UF 1)
  → Valider tous modules UF 1 → UF 2 ouverte
  → … → UF 5
  → Année 1 terminée → Année 2 VERROUILLÉE jusqu’à rentrée suivante
  → Directeur active année 2 → UF 6 ouverte → … → UF 11 (soutenance)
```

### 7.2 Espace Stage — spécification fonctionnelle (à développer)

| Acteur | Actions |
|--------|---------|
| Directeur | Déposer convention type / signée école ; déposer attestation d’assurance ; suivre dossiers |
| Apprenant | Déposer convention signée entreprise ; rapport de stage ; présentation digitale |
| Système | Statuts dossier (manquant / complet) ; pièces liées au module Stage / Rapport |

---

## 8. Plan d’implémentation

### Phase A — Fondations (faite)

- [x] Document programme + règles
- [x] Inscription → compte **désactivé** + activation directeur
- [x] Profil apprenant `/app/profile`
- [x] Seed 36 modules (métadonnées année / UF)
- [x] Dashboard groupé **Année → UF → Module**

### Phase B — Règles métier (suite décisions §7)

- [x] Formaliser décisions §7 dans ce document
- [x] Progression **par UF** (tous modules d’une UF accessibles)
- [x] Verrouillage année 2 jusqu’à `year2AccessEnabled` (+ bouton admin « Ouvrir A2 » / cohorte)
- [x] UI **titres seuls** (pas de codes)
- [x] Badge / message « En attente d’activation » sur login
- [x] Espace Stage & soutenance (dépôts directeur + apprenant)
- [x] Liste diplômes + marquage remise physique

### Phase C — Suite / contenu

- [ ] Contenu pédagogique réel par UF
- [ ] Signature électronique intégrée (vs dépôt PDF déjà signé)
- [ ] Ouverture année 2 automatisée à une date de rentrée (cron)

---

## 9. JSON de référence (brut client)

```json
{
  "programme_formation": [
    {
      "annee": "1ère Année",
      "unites_de_formation": [
        {
          "code": "UF 1",
          "intitule": "Langues et communication",
          "modules": [
            { "code": "1-1", "intitule": "Techniques de communication" },
            { "code": "1-2", "intitule": "Français" },
            { "code": "1-3", "intitule": "Anglais" },
            { "code": "1-4", "intitule": "Comportement et attitude" }
          ]
        },
        {
          "code": "UF 2",
          "intitule": "Exploitation touristique et aéroportuaire",
          "modules": [
            { "code": "2-1", "intitule": "Techniques d’animation" },
            { "code": "2-2", "intitule": "Accueil et réception" },
            { "code": "2-3", "intitule": "Exploitation des aéroports" },
            { "code": "2-4", "intitule": "Techniques d’agence de voyage" }
          ]
        },
        {
          "code": "UF 3",
          "intitule": "Environnement aéronautique",
          "modules": [
            { "code": "3-1", "intitule": "Connaissances aéronautiques (Français)" },
            { "code": "3-2", "intitule": "Connaissances aéronautiques (Anglais)" },
            { "code": "3-3", "intitule": "Réglementation (droit aérien, marchandises dangereuses et sûreté)" },
            { "code": "3-4", "intitule": "Connaissances de base en secourisme" }
          ]
        },
        {
          "code": "UF 4",
          "intitule": "Connaissances générales complémentaires",
          "modules": [
            { "code": "4-1", "intitule": "Marketing touristique et gestion commerciale" },
            { "code": "4-2", "intitule": "Législation générale et spécifique (généralité et F/ PNC)" },
            { "code": "4-3", "intitule": "Economie et sociologie du Tourisme" },
            { "code": "4-4", "intitule": "Géographie touristique" }
          ]
        },
        {
          "code": "UF 5",
          "intitule": "Stage en milieu réel",
          "modules": [
            { "code": "5-1", "intitule": "Stage en milieu réel" },
            { "code": "5-2", "intitule": "Rapport de stage" }
          ]
        }
      ]
    },
    {
      "annee": "2ème Année",
      "unites_de_formation": [
        {
          "code": "UF 6",
          "intitule": "Techniques d’expression",
          "modules": [
            { "code": "6-1", "intitule": "Français (touristique)" },
            { "code": "6-2", "intitule": "Anglais (touristique)" },
            { "code": "6-3", "intitule": "Espagnol" },
            { "code": "6-4", "intitule": "Anglais technique" }
          ]
        },
        {
          "code": "UF 7",
          "intitule": "Gestion et exploitation touristiques",
          "modules": [
            { "code": "7-1", "intitule": "Guidage et accompagnement" },
            { "code": "7-2", "intitule": "Restauration et hygiène" },
            { "code": "7-3", "intitule": "Technique d’annonce et d’assistance" },
            { "code": "7-4", "intitule": "Technique d’animation" }
          ]
        },
        {
          "code": "UF 8",
          "intitule": "Exploitation aéronautique",
          "modules": [
            { "code": "8-1", "intitule": "Sécurité dans les avions" },
            { "code": "8-2", "intitule": "Safety and first aid" },
            { "code": "8-3", "intitule": "Sauvetage et secourisme" },
            { "code": "8-4", "intitule": "CRM (crew ressource management)" }
          ]
        },
        {
          "code": "UF 9",
          "intitule": "Connaissances et outils de gestion",
          "modules": [
            { "code": "9-1", "intitule": "Applications informatiques et bureautiques" },
            { "code": "9-2", "intitule": "Techniques de vente" },
            { "code": "9-3", "intitule": "Monde contemporain, histoire et civilisation" }
          ]
        },
        {
          "code": "UF 10",
          "intitule": "Culture d’entreprise",
          "modules": [
            { "code": "10-1", "intitule": "Recherche d’emploi" },
            { "code": "10-2", "intitule": "Création d’entreprise" }
          ]
        },
        {
          "code": "UF 11",
          "intitule": "Travaux de synthèse",
          "modules": [
            { "code": "11-1", "intitule": "Soutenance" }
          ]
        }
      ]
    }
  ]
}
```

---

## 11. Décisions validées (suite)

| # | Question | Réponse client | Implémentation |
|---|----------|----------------|----------------|
| 1 | Signature électronique | Dépôt PDF déjà signé | Upload fichier — pas de DocuSign |
| 2 | Ouverture année 2 | Date de rentrée automatique | Paramètre admin `year2OpeningDate` ; ouverture auto si année 1 terminée (UF 5 validée) |
| 3 | Stage bloquant | Le directeur valide UF 5 / UF 11 | Boutons sur `/admin/stage` — débloque la suite |
| 4 | Diplômes | Admin seul | Menu + API réservés ADMIN ; bouton **PDF école** |
| 5 | Présentation | PPT ou PDF | Contrôle upload `PRESENTATION_SOUTENANCE` |
| 6 | PDF attestation | Réservé à l’école | Apprenant : code/statut seulement ; PDF admin only |

---

## 12. Résumé pour la démo / suivi

1. Montrer l’inscription → compte en attente.  
2. Directeur active dans l’admin.  
3. Apprenant voit le catalogue **Année → UF → modules** (titres, progression par UF).  
4. Profil + espace **Stage / soutenance**.  
5. Fin de cycle : diplôme listé admin → **remise physique**.  
6. Contenu pédagogique à renseigner module par module avec l’école.

