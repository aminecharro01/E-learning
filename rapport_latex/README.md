# Rapport PFE — IAT Academy

Ce dossier contient le rapport de stage/PFE complet pour le projet IAT
Academy, ainsi que les sources des diagrammes UML qui l'illustrent.

## Structure

```
rapport_latex/
├── main.tex                          # document maître
├── preambule.tex                     # packages et mise en forme (normes PFE)
├── page_de_garde.tex                 # page de garde — À PERSONNALISER
├── bibliographie.bib                 # références (à compléter)
├── chapitres/
│   ├── ch1_contexte.tex
│   ├── ch2_analyse_conception.tex
│   ├── ch3_realisation.tex            # cœur du rapport : points forts techniques
│   └── ch4_tests_deploiement.tex
└── images/                           # logos + diagrammes inclus dans le rapport

diagrammes/
├── diagramme_cas_utilisation.puml     # PlantUML — diagrammes UML
├── diagramme_classes_pedagogie.puml
├── diagramme_classes_evaluation.puml
├── diagramme_classes_stage_certification.puml
├── diagramme_sequence_*.puml          # 8 diagrammes de séquence
├── mingrammer/                        # Python (mingrammer/diagrams) — schémas d'infrastructure
│   ├── diagramme_architecture.py
│   ├── diagramme_deploiement.py
│   └── requirements.txt
└── images/                           # PNG générés (300 DPI), toutes sources confondues
```

Deux outils différents génèrent les diagrammes, chacun choisi pour ce
qu'il représente le mieux : **PlantUML** pour les diagrammes UML (cas
d'utilisation, classes, séquence — sémantique de lignes de vie, de
compartiments de classe, que mingrammer ne sait pas exprimer), et
**Python/mingrammer** pour l'architecture en couches et le déploiement,
qui sont par nature des schémas de composants/infrastructure — mingrammer
les rend avec de vraies icônes (Spring, Next.js, PostgreSQL, Redis, nginx)
et un nombre de niveaux d'imbrication volontairement réduit par rapport à
la version PlantUML initiale, pour un rendu plus lisible sur une page A4
verticale.

## À personnaliser avant remise

- **`page_de_garde.tex`** : nom de l'établissement, filière, votre nom,
  noms des encadrants, année universitaire, et remplacez
  `images/logo_ecole_placeholder.png` par le logo réel de votre
  établissement.
- **`main.tex`** : les sections « Remerciements », « Introduction
  générale » et « Conclusion générale » contiennent un texte déjà rédigé
  et réutilisable tel quel, mais méritent d'être relues et ajustées à
  votre expérience personnelle (noms des encadrants dans les
  remerciements, par exemple).
- **`chapitres/ch1_contexte.tex`** : le planning (§1.4) est une
  répartition indicative des grandes phases ; ajoutez vos dates réelles
  et un diagramme de Gantt si votre établissement l'exige.
- **`bibliographie.bib`** : quelques références de départ sont fournies
  (Spring, Spring Security, JWT, PlantUML, OWASP, Redis, Flyway) ;
  complétez-la au fil de la rédaction.

## Recompiler le rapport

Prérequis : une distribution LaTeX (MiKTeX ou TeX Live) avec `pdflatex`,
`biber`, et les packages listés dans `preambule.tex` (installés
automatiquement à la demande par MiKTeX).

Depuis `rapport_latex/` :

```bash
pdflatex -interaction=nonstopmode main.tex
biber main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
```

Les trois dernières commandes sont nécessaires : la première génère les
références de citation, `biber` les résout en bibliographie, et les deux
derniers passages `pdflatex` stabilisent la table des matières, les
numéros de figures/tableaux et les renvois `\ref{}`. Un unique passage
`pdflatex` affichera des avertissements « Reference undefined » ou
« Please rerun Biber » — c'est normal et attendu au premier passage.

## Régénérer les diagrammes après modification du code source

Les fichiers `.puml` et les scripts `.py` sont les sources éditables ; les
`.png` dans `diagrammes/images/` sont générés automatiquement et ne
doivent pas être édités à la main.

### Diagrammes UML (PlantUML) — cas d'utilisation, classes, séquence

1. **Installer PlantUML** (nécessite Java) :
   ```bash
   # Téléchargement direct du jar (pas d'installation système requise)
   curl -sSL -o plantuml.jar \
     https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar

   # ou via un gestionnaire de paquets :
   # macOS   : brew install plantuml
   # Debian/Ubuntu : sudo apt install plantuml
   ```

2. **Modifier** le ou les fichiers `.puml` concernés dans `diagrammes/`.

3. **Régénérer les PNG** (300 DPI, avec une limite de taille de canevas
   augmentée pour éviter tout rognage silencieux des diagrammes les plus
   larges) :
   ```bash
   cd diagrammes
   java -DPLANTUML_LIMIT_SIZE=16384 -jar /chemin/vers/plantuml.jar -tpng -o images *.puml
   ```

   > **Piège à éviter** : sans `-DPLANTUML_LIMIT_SIZE`, PlantUML rogne
   > silencieusement (sans erreur) tout diagramme dont le rendu à 300 DPI
   > dépasse sa limite de canevas par défaut. Après toute modification
   > d'un diagramme volumineux (architecture, cas d'utilisation), vérifiez
   > que les dimensions du PNG généré n'affichent pas un rapport largeur/
   > hauteur qui semble avoir été tronqué à une valeur ronde (4096, 8192).

4. **Recompiler le rapport** (voir section précédente) pour que les
   figures mises à jour apparaissent dans le PDF.

### Diagrammes d'infrastructure (Python / mingrammer) — architecture, déploiement

1. **Installer les dépendances** (nécessite Python 3.9+ et Graphviz —
   `dot` doit être sur le `PATH` ; `sudo apt install graphviz` /
   `brew install graphviz` / installateur Windows depuis graphviz.org) :
   ```bash
   pip install -r diagrammes/mingrammer/requirements.txt
   ```

2. **Modifier** le script concerné
   (`diagrammes/mingrammer/diagramme_architecture.py` ou
   `diagramme_deploiement.py`).

3. **Régénérer le PNG** — chaque script écrit directement dans
   `diagrammes/images/` (300 DPI, orientation portrait par construction
   grâce à `direction="TB"`) :
   ```bash
   cd diagrammes/mingrammer
   python diagramme_architecture.py
   python diagramme_deploiement.py
   ```

4. **Recompiler le rapport** comme ci-dessus.

> Ces deux diagrammes ont volontairement été reconstruits avec
> mingrammer plutôt que PlantUML : ce sont par nature des schémas
> d'infrastructure (conteneurs, bases de données, services externes), le
> registre exact où mingrammer excelle avec de vraies icônes et une
> imbrication à un seul niveau — contrairement aux versions PlantUML
> initiales qui empilaient jusqu'à quatre niveaux de paquets imbriqués.

## Tableau de synthèse des points forts techniques

Le Tableau 3.7 du rapport (chapitre 3, section « Points forts techniques
et valeur ajoutée ») liste les onze mécanismes qui distinguent ce projet
d'une application CRUD classique, avec leur emplacement exact dans le
code source et l'argument de valeur ajoutée associé. Il est reproduit
ci-dessous pour être réutilisé directement comme support de soutenance.

| Mécanisme | Localisation | Valeur ajoutée |
|---|---|---|
| Génération de questions par IA (repli Gemini/Grok) | `QuestionGenerationService` | Fonctionnalité IA fiable en production, jamais dépendante d'un seul fournisseur externe. |
| Correction hybride de quiz (auto + manuelle) | `QuizAttemptService`, `QuizGradingService` | Un score final toujours cohérent, jamais figé avant qu'une correction manuelle en attente ne soit terminée. |
| Progression séquentielle par UF → certificat | `ProgressionService`, `UfValidationService`, `CertificateService` | Respecte les validations humaines obligatoires (stage, soutenance) sans jamais les court-circuiter automatiquement. |
| Contrôle d'accès à granularité fine | `MessagingService`, `NotificationService`, `LessonNoteService`, `StageService` | Ferme une classe de vulnérabilités IDOR que le seul RBAC ne peut pas couvrir. |
| Limitation de débit Redis transverse | `RateLimitService` | Protège à la fois la sécurité (force brute) et le budget d'exploitation (appels IA payants) avec un seul mécanisme réutilisable. |
| Certificat vérifiable publiquement + partage LinkedIn | `CertificateService`, page `/verify/[code]` | Transforme un diplôme statique en preuve vérifiable et en outil d'employabilité réelle. |
| Recherche globale avec confidentialité des questions | `SearchService`, `SearchController` | Un outil pédagogique qui ne peut jamais devenir un outil de triche. |
| Bourse à l'emploi dérivée du certificat | `JobOfferService` | Le statut « diplômé » ne peut jamais se désynchroniser de la réalité (source de vérité unique). |
| Campagnes email asynchrones à débit maîtrisé | `EmailCampaignService`, `CampaignSenderWorker` | L'administrateur n'attend jamais l'envoi complet, sans jamais saturer le serveur SMTP. |
| Détection d'inactivité | `EarlyWarningService` | Signal fiable pour l'intervention pédagogique, sans mécanisme de suivi dédié supplémentaire. |
| Verrou d'édition collaboratif | `LessonLockService` | Prévient un conflit d'édition entre formateurs plutôt que de le constater après coup. |

## Limites assumées (chapitre 3, §3.3)

Deux limites ont été identifiées en analysant le code (et non supposées a
priori) et sont documentées en toute transparence dans le rapport :
l'absence de contrôle de propriété dans `AssignmentService` (contrairement
aux autres services listés ci-dessus), et l'absence de reprise
automatique d'une campagne email interrompue par un redémarrage serveur.
