# Prompts d'infographies — Nano Banana (Gemini 2.5 Flash Image)

Prompts prêts à l'emploi pour générer des infographies/schémas sur IAT Academy, calés sur la charte graphique réelle de l'application (navy `#142B4B`, or `#E08D1B` → `#C97612`, typographie géométrique façon Poppins/Inter, motif "carte d'embarquement") et sur des faits vérifiés dans le code (31 contrôleurs, 39 entités, 151 tests, 7 badges, hiérarchie de rôles réelle, repli IA Gemini → Grok).

**Conseils d'usage** :
- Nano Banana suit mieux les prompts quand le texte à afficher est mis entre guillemets exacts (comme ci-dessous) — il respecte plutôt bien les libellés courts.
- Si un rendu texte est imprécis (fautes dans les libellés), régénérez en insistant : *"render all text exactly as specified, no spelling changes"*.
- Pour l'intégrer ensuite dans le deck HTML ou le rapport, demandez un fond transparent ou une version au format 16:9 pour un alignement direct sur une slide.

---

## 1. Architecture en couches

```
Infographic, flat vector style, clean minimal tech-diagram aesthetic. Navy background (#142B4B), gold accents (#E08D1B to #C97612 gradient), white/light-blue text (#E8EEF6). Geometric sans-serif labels (Poppins-style, bold headers, thin body text).

Three horizontal stacked layers, top to bottom, each a rounded rectangle:
1. "FRONTEND — Next.js 15" (light card, navy text) with small icons: browser window, React logo silhouette
2. "API REST — Spring Boot 3" (navy card, gold border) with a small gear/cog icon, label "31 contrôleurs · 179 endpoints"
3. "DONNÉES — PostgreSQL 16 + Redis 7" (split into two side-by-side sub-boxes: a database cylinder icon for PostgreSQL, a lightning-bolt icon for Redis)

Thin gold arrows connecting each layer vertically, pointing both directions (bidirectional REST calls).
Small label on the side: "Architecture en couches — IAT Academy"
No photorealism, no 3D, no clutter — clean flat corporate infographic, lots of whitespace, 16:9 aspect ratio.
```

---

## 2. Hiérarchie des rôles (RBAC)

```
Infographic, flat vector pyramid/org-chart hybrid, navy (#142B4B) and gold (#E08D1B) color scheme on off-white background (#F7F9FC). Clean geometric icons (line-art style, gold stroke).

A pyramid of 3 tiers (widest at bottom) labeled top to bottom:
- "SUPER_ADMIN" (crown icon)
- "ADMIN (Directeur)" (briefcase icon)
- "FORMATEUR" (chalkboard icon)
Below the pyramid, two separate boxes NOT part of the hierarchy, connected by a dotted line labeled "hors hiérarchie staff":
- "ÉTUDIANT" (graduation cap icon)
- "SUPPORT" (headset icon, with small text "messagerie uniquement")

Off to the side, two small dashed-outline boxes labeled "Acteurs externes (sans compte)": "Tuteur de stage" (pen/signature icon) and "Recruteur / Public" (magnifying glass icon).

Title at top: "Hiérarchie des rôles — IAT Academy". Clean corporate infographic style, no photorealism, 16:9.
```

---

## 3. Repli IA (Gemini → Grok)

```
Infographic flowchart, flat vector style, navy (#142B4B) background, gold (#F5A623) accent arrows, white cards with rounded corners.

Horizontal flow, left to right, 4 steps connected by gold arrows:
1. Card: "Formateur clique Générer" (icon: sparkle/magic wand)
2. Card: "Google Gemini" (icon: primary API, labeled "Fournisseur principal") — arrow continues to step 3 labeled "Échec (timeout / JSON invalide)" in red dashed style
3. Card: "xAI Grok" (icon: fallback/shield, labeled "Repli automatique")
4. Card: "Questions validées" (icon: checkmark, labeled "Même validation qu'une question manuelle")

Below the flow, a small red warning branch showing: both fail → "Erreur explicite (jamais silencieuse)".
Small badge in corner: "20 générations / 5 min — limite Redis".
Title: "Génération de questions par IA — repli résilient". Clean, minimal, corporate tech infographic, 16:9, no photorealism.
```

---

## 4. Parcours de l'apprenant (motif carte d'embarquement)

```
Infographic styled as an airline boarding-pass journey map, flat vector illustration. Navy (#142B4B) and gold (#E08D1B) palette, off-white background, dashed perforation lines between sections like a real boarding pass.

A horizontal "flight path" dotted line with a small airplane icon traveling along it, connecting 6 circular waypoint icons left to right:
1. "Connexion" (door/login icon)
2. "Tableau de bord" (dashboard icon)
3. "Quiz + IA" (brain/sparkle icon)
4. "Stage" (briefcase icon, small padlock badge)
5. "Certificat" (verified badge/checkmark shield icon)
6. "Badge partagé" (medal/ribbon icon, small LinkedIn "in" glyph nearby)

Each waypoint sits on a small boarding-pass-style ticket stub (rounded rectangle, dashed left edge, tiny barcode graphic).
Title at top in bold geometric type: "Le parcours de l'apprenant — IAT Academy".
Clean flat design, no photorealism, no real logos, 16:9 aspect ratio.
```

---

## 5. Chiffres clés (stat infographic)

```
Infographic, flat vector "big numbers" dashboard style. Navy (#142B4B) background, gold (#F5A623 to #FFD98A) numerals, white labels below each number, laid out in a clean 5-column grid.

Five large stat blocks, each a gold number above a small white caption:
"31" — Contrôleurs REST
"179" — Points d'accès API
"39" — Entités JPA
"151" — Tests automatisés
"7" — Badges de progression

Each block has a small thin-line icon above the number (server icon, plug icon, database icon, checkmark icon, medal icon respectively).
A thin gold divider line separates each column. Title above: "IAT Academy en chiffres".
Corporate, clean, minimal, lots of negative space, no photorealism, 16:9 or square format.
```

---

## 6. Sécurité en profondeur (defense-in-depth)

```
Infographic, flat vector concentric-rings diagram (like security "onion layers"), navy (#142B4B) center fading to lighter navy/gold rings outward, off-white background.

4 concentric rings, labeled from outer to inner with a small icon each:
- Outer ring: "CORS + Rate limiting Redis" (shield icon)
- Ring 2: "JWT en cookie httpOnly" (lock icon)
- Ring 3: "RBAC — hiérarchie de rôles" (key icon)
- Inner core (gold, glowing subtly): "Contrôle de propriété par ressource" (fingerprint/checkmark icon), labeled "assertAccess()"

Small annotation pointing to the core: "Va au-delà du simple RBAC — ferme les failles IDOR".
Title: "Sécurité en profondeur — IAT Academy". Clean flat corporate infographic, no photorealism, 1:1 or 16:9.
```

---

## 7. Répartition des entités par domaine (donut/treemap)

```
Infographic, flat vector donut chart, navy (#142B4B) outline, segments colored in a gold-to-navy gradient palette (9 distinct shades from #FFD98A to #142B4B), off-white background.

A donut chart with 9 segments sized proportionally, each labeled with a leader line to a small text label outside the circle:
"Comptes & sécurité (2)", "Structure pédagogique (4)", "Contenu & médias (4)", "Évaluation & quiz (9)", "Progression & certification (4)", "Groupes (2)", "Communication (10)", "Stage & emploi (2)", "Gamification (2)"

Center of donut shows large text: "39" with small caption "entités JPA" below it.
Title above: "Le modèle de données par domaine". Clean minimal corporate infographic style, no photorealism, 1:1 aspect ratio.
```
