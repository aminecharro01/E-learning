# Diagrammes v2 — version enrichie pour la soutenance

Version enrichie des 4 diagrammes utilisés dans `docs/presentation.pdf`
(slides 10 à 13). Par rapport aux originaux dans `diagrammes/`, chaque
diagramme ajoute :

- **des relations nommées** (le verbe métier sur chaque association, pas
  juste une ligne muette) ;
- **des notes visuelles** qui rappellent, directement sur le schéma, les
  points techniques les plus importants et les plus faciles à oublier à
  l'oral — vérifiés contre le code réel dans cette session.

## Correspondance avec les slides

| Fichier | Remplace (dans `presentation.pdf`) |
|---|---|
| `diagramme_cas_utilisation.puml` | Slide 10 — Diagramme de cas d'utilisation |
| `diagramme_classes_ensemble.puml` | Slide 11 — Diagramme de classes |
| `diagramme_sequence_generation_questions_ia.puml` | Slide 12 — Séquence 1 (génération IA) |
| `diagramme_sequence_progression_uf_certificat.puml` | Slide 13 — Séquence 2 (progression/certificat) |

## Ce qui a été ajouté, diagramme par diagramme

**Cas d'utilisation** — relations actorusecase toutes nommées ; note sur
`Support` (hérite de `User`, pas de `Formateur` — exclu de `isStaff()`) ;
note sur l'héritage UML `Admin --|> Formateur` (facilité de diagramme, pas
une hiérarchie de classes Java réelle — c'est `RoleHierarchyImpl`) ; note
sur le tuteur de stage (signe sans compte, via token à usage unique).

**Classes (vue d'ensemble)** — attributs `ufCode`/`yearNumber` ajoutés sur
`ModuleEntity` pour rendre visible le choix « Année/UF = attribut, pas
table » ; note dédiée à ce choix ; note sur les 4 portées de `Quiz`
(`APPLICATIF`/`FIN_MODULE`/`FIN_UF`/`FIN_ANNEE`) ; note sur
`LearnerGroup` (apprenant en ligne vs hybride) ; note citant le Javadoc
réel de `JobOfferService` sur la dépendance `JobOffer ..> Certificate`.

**Séquence IA** — note sur la limite de rate limiting (20/5min, protège un
coût financier réel) ; note sur la notion de fournisseur « configuré » ;
note sur la réutilisation de la même validation qu'une question manuelle.

**Séquence progression/certificat** — note ajoutée sur la contrainte SQL
`UNIQUE(user_id, formation_id)` comme filet de sécurité en base, en plus
des notes déjà présentes sur le point d'application du gate Directeur.

## Régénérer les images

```bash
cd diagrammes_v2
java -DPLANTUML_LIMIT_SIZE=16384 -jar /chemin/vers/plantuml.jar -tpng -o images *.puml
```

Le diagramme de cas d'utilisation utilise `skinparam linetype polyline`
(plutôt que `ortho` comme les autres) — avec autant de relations nommées,
les lignes obliques génèrent beaucoup moins de croisements que les lignes
à angle droit.

## À faire avant la soutenance

Remplacer les images correspondantes dans `docs/presentation.pdf` /
`docs/presentation.pptx` par celles de `diagrammes_v2/images/` (slides
10 à 13), en gardant les diagrammes déjà présents dans `diagrammes/`
inchangés pour le rapport LaTeX.
