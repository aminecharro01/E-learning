# 6. Infrastructure et déploiement

Ce chapitre décrit l'infrastructure réelle du projet IAT Academy telle qu'elle existe dans le dépôt à la date de rédaction : environnement de développement, conteneurisation, variables d'environnement, réseau, procédure de déploiement, hébergement, CI/CD et observabilité. Chaque affirmation renvoie à un fichier de configuration existant dans le dépôt ; aucune valeur n'a été supposée.

## 6.1 Vue d'ensemble

Le projet est un monorepo à deux modules (`backend/`, `frontend/`) avec deux dépendances d'infrastructure (PostgreSQL, Redis) et un reverse proxy Nginx préparé mais pas encore activé en Docker Compose. Il n'existe à ce jour :
- **aucun** `docker-compose.prod.yml` (un seul fichier compose à la racine, `docker-compose.yml`, qui ne couvre que Postgres et Redis) ;
- **aucun** `frontend/Dockerfile` (seul `backend/Dockerfile` existe) ;
- **aucun** pipeline CI/CD (pas de dossier `.github/workflows/`) ;
- **aucune** plateforme d'hébergement production configurée dans le code — seule une mention informelle dans `README.md` ("Hostinger VPS") indique l'intention, sans configuration technique correspondante (pas de secrets de déploiement, pas de script `deploy.sh`, pas d'IaC).

## 6.2 Environnement de développement

La procédure documentée dans `README.md` (§ "Démarrage rapide (dev)") est la suivante :

**Prérequis** : Docker Desktop, Java 21+ (`README.md` l.32), Node.js 20+.

> Remarque : `backend/pom.xml` déclare `<java.version>17</java.version>` (l.21) et `backend/Dockerfile` construit avec `eclipse-temurin:17-jdk`/`17-jre`. Le README annonce Java 21+ comme prérequis outil, mais le code compile et s'exécute en cible Java 17 — ce sont deux informations différentes présentes toutes les deux dans le dépôt, retranscrites telles quelles ici sans arbitrage.

1. **Variables d'environnement** : `cp .env.example .env` à la racine.
2. **Bases de données** : `docker compose up -d postgres redis` — démarre uniquement les deux conteneurs d'infrastructure (voir §6.3), pas l'API ni le frontend.
3. **Backend** : `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`, exposé sur `http://localhost:8080`, Swagger sur `/swagger-ui.html`. Le profil `dev` (`application-dev.yml`) active `spring.jpa.show-sql: true`, les logs `DEBUG` pour `ma.iatacademy` et `org.springframework.security`, et fournit un `JWT_SECRET` de repli local (`dev-only-secret-do-not-use-in-production-...`) pour que le backend démarre sans configuration supplémentaire.
4. **Frontend** : `cd frontend && npm install && npm run dev`, exposé sur `http://localhost:3000`. Le script `dev` (`frontend/package.json` l.6) lance `next dev --turbopack`.

En développement, backend et frontend tournent donc **en local, hors Docker** (processus JVM et processus Node natifs) ; seuls Postgres et Redis sont conteneurisés. C'est cohérent avec les commandes listées dans le `CLAUDE.md` du projet (`./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`, `npm run dev`).

Scripts backend disponibles (`backend/pom.xml`, wrapper Maven) : `./mvnw -q compile`, `./mvnw -q test`, `./mvnw spring-boot:run`.
Scripts frontend disponibles (`frontend/package.json`) : `dev`, `build` (`next build --turbopack`), `start` (`next start`), `lint`, `test` (`vitest run`), `test:watch`, `test:e2e` (`playwright test`).

## 6.3 Docker / Docker Compose

Le seul fichier Compose du dépôt est `docker-compose.yml` (racine), avec deux services actifs :

| Service | Image | Container name | Port hôte → conteneur | Volume | Healthcheck |
|---|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `iat-postgres` | `5433 → 5432` | `postgres_data:/var/lib/postgresql/data` | `pg_isready -U iat -d iat_academy` (5s/5s/10 retries) |
| `redis` | `redis:7-alpine` | `iat-redis` | `6379 → 6379` | `redis_data:/data` | `redis-cli ping` (5s/3s/10 retries), lancé avec `--appendonly yes` |

Le décalage de port Postgres (`5433` côté hôte au lieu de `5432`) est documenté dans `README.md` : il évite un conflit avec une instance PostgreSQL locale déjà installée (typiquement sous Windows).

Un bloc `api`/`frontend` est présent en **commentaire** dans le fichier (l.33-46), avec la note explicite `# API & frontend services will be enabled in a later step (Dockerfiles ready in deploy/)`. Ce commentaire montre l'intention (conteneuriser aussi l'API avec un `build: ./backend`, un `env_file: .env`, un mapping `8080:8080` et un volume `./data/media:/data/media`, dépendant de `postgres`/`redis` via `condition: service_healthy`), mais **ce service n'est pas actif aujourd'hui** — c'est une cible planifiée, pas l'état réel.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: iat-postgres
    environment:
      POSTGRES_DB: iat_academy
      POSTGRES_USER: iat
      POSTGRES_PASSWORD: ***
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U iat -d iat_academy"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: iat-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
    command: ["redis-server", "--appendonly", "yes"]

  # API & frontend services will be enabled in a later step (Dockerfiles ready in deploy/)

volumes:
  postgres_data:
  redis_data:
```

(Le mot de passe Postgres réel dans le fichier est une valeur de développement en clair, masquée ici par `***` par précaution ; en pratique il n'a de valeur qu'en local et n'a pas vocation à être réutilisé tel quel en production.)

### `backend/Dockerfile`

Build multi-stage déjà prêt (mais non branché dans `docker-compose.yml` — voir ci-dessus) :

```dockerfile
# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline
COPY src ./src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Stage 1 (`build`, image JDK) compile le jar avec Maven Wrapper en sautant les tests ; stage 2 (image JRE, plus légère) ne copie que le jar final — un pattern classique de build multi-stage pour réduire la taille de l'image finale. Le port exposé (`8080`) correspond au port par défaut de l'API (`server.port` dans `application.yml`).

Il n'existe **pas** de `frontend/Dockerfile` dans le dépôt à ce jour : le frontend n'a jamais été conteneurisé, ni en dev ni dans une cible de prod documentée.

## 6.4 Réseau

En développement, il n'y a pas de réseau Docker applicatif explicite : `docker-compose.yml` ne déclare qu'un réseau par défaut implicite pour `postgres`/`redis` (Compose crée un réseau bridge par projet automatiquement). Backend et frontend, tournant en local hors conteneur, atteignent Postgres/Redis via `localhost:5433` / `localhost:6379` (ports publiés vers l'hôte).

La configuration Nginx (`deploy/nginx/conf.d/elearning.conf`) anticipe un réseau Docker à trois services, avec résolution par **nom de service** (DNS interne Compose) :

```nginx
upstream iat_api {
    server api:8080;
}

upstream iat_frontend {
    server frontend:3000;
}
```

Cela suppose des services nommés `api` (port 8080) et `frontend` (port 3000) dans un futur `docker-compose.yml` étendu — cohérent avec le bloc commenté décrit en §6.3, mais **ce réseau n'existe pas encore** : `elearning.conf` est un fichier de configuration prêt à l'emploi, pas une configuration active tant que le service `nginx` n'apparaît nulle part dans le compose actuel.

## 6.5 Reverse proxy Nginx (configuration cible, non active)

`deploy/nginx/conf.d/elearning.conf` définit un unique `server` écoutant sur le port `80`, avec les règles suivantes :
- `client_max_body_size 520m` — cohérent avec les limites d'upload définies côté Spring (`spring.servlet.multipart.max-file-size: 200MB` / `max-request-size: 210MB` dans `application.yml`, avec une marge supplémentaire côté proxy).
- `location /` → proxy vers `iat_frontend` (Next.js), avec les en-têtes `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` et support de l'upgrade WebSocket (`Upgrade`/`Connection`).
- `location /api/` → proxy vers `iat_api`, `proxy_read_timeout 300s` (marge pour les opérations longues, ex. génération de questions IA).
- `location /swagger-ui/` et `/api-docs` → proxy vers `iat_api`.
- `location /internal-media/` marquée `internal;` avec `alias /data/media/;` — pensée pour un futur `X-Accel-Redirect` émis par Spring afin de servir les fichiers médias protégés sans que Nginx ne les expose directement (commentaire dans le fichier : "use with X-Accel-Redirect from Spring in later hardening") — **non implémenté côté backend à ce jour**, c'est une piste de durcissement documentée mais pas câblée.

Le commentaire en tête du fichier — "In production, terminate TLS here and set secure cookies." — confirme que la terminaison TLS est prévue au niveau Nginx en cible, mais qu'elle n'est pas configurée dans ce fichier (pas de bloc `listen 443 ssl`, pas de directive `ssl_certificate`).

## 6.6 Variables d'environnement

Source : `.env.example` (racine). Regroupées par domaine, avec valeurs par défaut non sensibles uniquement.

**Base de données**
```
DB_URL=jdbc:postgresql://localhost:5433/iat_academy
DB_USER=iat
DB_PASSWORD=***
```

**Redis**
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**JWT**
```
JWT_SECRET=***                      # doit faire ≥ 256 bits / 32 caractères
JWT_EXPIRATION_MS=86400000
JWT_COOKIE_NAME=iat_token
JWT_COOKIE_SECURE=false             # à mettre à true derrière HTTPS en production
```

**Application / réseau**
```
SERVER_PORT=8080
CORS_ORIGINS=http://localhost:3000
MEDIA_ROOT=./data/media
MEDIA_SIGNED_TTL=3600
TRUSTED_PROXIES=                    # IPs de proxys de confiance autorisées à poser X-Forwarded-For
SWAGGER_ENABLED=true                # à désactiver en production
```

**Bunny Stream (vidéo, optionnel)**
```
BUNNY_STREAM_ENABLED=false
BUNNY_LIBRARY_ID=
BUNNY_API_KEY=
BUNNY_PULL_ZONE_HOSTNAME=
```

**IA — génération de questions (Gemini primaire, Grok fallback)**
```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
GROK_API_KEY=
GROK_MODEL=grok-2-latest
```

**Frontend**
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_JWT_COOKIE_NAME=iat_token
```

Le frontend possède en plus son propre gabarit local, `frontend/.env.local.example` :
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Variables additionnelles trouvées dans `application.yml` mais absentes de `.env.example` (valeurs par défaut définies uniquement côté Spring, via la syntaxe `${VAR:default}`) : `MAIL_HOST`, `MAIL_PORT` (587), `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENABLED` (false), `MAIL_FROM`, `FRONTEND_BASE_URL`, `MEDIA_SIGNING_SECRET`, `MEDIA_MAX_IMAGE_BYTES`, `MEDIA_MAX_DOCUMENT_BYTES`, `MEDIA_MAX_VIDEO_BYTES`, `APP_PLATFORM_NAME`, `APP_SUPPORT_EMAIL`, `APP_REGISTRATION_ENABLED`, `APP_DEFAULT_RESET_PASSWORD`, `DEMO_RESET_PROGRESS`. Toutes ont une valeur par défaut sûre pour un environnement de démo/dev (ex. mail désactivé par défaut, pas de secret en clair pour `MEDIA_SIGNING_SECRET` qui reste vide par défaut).

Le fichier `.env` réel (racine, présent mais **non suivi par git** — voir `.gitignore` lignes 11-14 : `.env`, `.env.local`, `.env.*.local` ignorés, seul `.env.example` est explicitement conservé) contient les vraies valeurs locales ; il n'a pas été lu en détail dans ce document car il n'apporte rien de plus que `.env.example` du point de vue documentaire, et pour éviter tout risque d'y trouver une valeur sensible à retranscrire.

## 6.7 Base de données

- **Moteur** : PostgreSQL 16 (image `postgres:16-alpine`).
- **Port réel** : `5433` côté hôte (mappé vers `5432` dans le conteneur) — choisi pour éviter un conflit avec une installation PostgreSQL native sur la machine de développement (note explicite dans `README.md`).
- **Nom de base** : `iat_academy`.
- **Utilisateur** : `iat`.
- **Connexion applicative** : `spring.datasource.url` = `${DB_URL:jdbc:postgresql://localhost:5433/iat_academy}` (`application.yml` l.5), donc par défaut le backend se connecte lui aussi sur `localhost:5433` — cohérent avec un backend qui tourne en local (hors Docker) en développement, comme décrit en §6.2.
- **Migrations** : Flyway activé (`spring.flyway.enabled: true`), scripts dans `classpath:db/migration` → fichiers `backend/src/main/resources/db/migration/V<N>__description.sql`. `hibernate.ddl-auto: validate` — Hibernate ne modifie jamais le schéma, il vérifie seulement sa cohérence avec les entités ; toute évolution de schéma passe obligatoirement par une nouvelle migration Flyway.

## 6.8 Procédure de déploiement

**Réel, documenté** : uniquement la procédure de démarrage **local/dev** décrite en §6.2 (`README.md`). Aucun script de déploiement (`deploy.sh`, `Makefile` de déploiement, playbook Ansible, manifeste Kubernetes) n'existe dans le dépôt.

**Cible anticipée, non active** : la présence de `deploy/nginx/conf.d/elearning.conf` (reverse proxy prêt pour un couple `api`/`frontend` conteneurisés) et du commentaire dans `docker-compose.yml` ("API & frontend services will be enabled in a later step (Dockerfiles ready in deploy/)") dessinent la trajectoire prévue :
1. Construire les images `backend` (Dockerfile déjà prêt) et `frontend` (Dockerfile à écrire).
2. Décommenter/étendre le service `api` dans `docker-compose.yml`, ajouter un service `frontend` et un service `nginx` montant `deploy/nginx/conf.d/`.
3. Servir l'ensemble derrière Nginx en frontal (port 80/443), avec `api`/`frontend` comme noms de service internes résolus par le DNS Docker Compose.

Cette trajectoire est **anticipée dans la configuration mais pas exécutée** : à ce jour, il n'existe pas de commande unique "déployer en production" dans le dépôt.

## 6.9 Hébergement

`README.md` (tableau "Stack", ligne "Infra") mentionne : `Docker Compose · Hostinger VPS`. C'est la seule référence à un hébergement dans tout le dépôt — aucune configuration technique correspondante (pas d'IP, pas de nom de domaine, pas de script de provisioning, pas de fichier d'inventaire) n'existe. **L'hébergement de production n'est donc pas encore défini techniquement** ; seule une intention est notée dans la documentation. Ce point est identifié comme restant à finaliser dans les perspectives d'évolution du projet.

## 6.10 CI/CD

Aucun fichier CI/CD n'existe dans le dépôt : pas de dossier `.github/workflows/`, pas de `.gitlab-ci.yml`, pas de `Jenkinsfile` (vérifié à la racine et dans `backend/`, `frontend/` — hors `node_modules`, qui contient des workflows CI appartenant à des dépendances tierces et sans rapport avec ce projet). Les commandes de build/test/lint sont exécutées manuellement par le développeur (voir `CLAUDE.md` : `./mvnw -q test`, `npx tsc --noEmit`, `npx eslint`, `npm run build`, `npm run test`).

**L'automatisation CI/CD est donc une perspective d'évolution identifiée**, pas un existant : une pipeline future pourrait exécuter `./mvnw -q test` + `./mvnw -q compile` côté backend, et `npx tsc --noEmit` + `npx eslint` + `npm run build` + `npm run test` côté frontend, à chaque push/pull request, avant d'envisager un déploiement automatisé vers l'hébergement cible (§6.9).

## 6.11 Monitoring et logging

**Actuator** : `spring-boot-starter-actuator` est déclaré comme dépendance dans `backend/pom.xml` (l.49). La configuration réelle dans `application.yml` restreint volontairement la surface exposée :

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: never
  health:
    mail:
      enabled: false
```

Le commentaire du fichier explique le raisonnement :
- Seul `/actuator/health` est exposé (pas `/actuator/beans`, `/actuator/env`, etc.) — ce endpoint est explicitement rendu public dans `SecurityConfig` pour servir de healthcheck (Docker/load balancer).
- `show-details: never` empêche de révéler à un appelant non authentifié le détail des composants vérifiés (état de la connexion DB, de Redis...).
- `management.health.mail.enabled: false` désactive le contrôleur de santé du composant mail : `MAIL_HOST` est vide par défaut (mail désactivé, voir §6.6/`app.mail.enabled: false`) et l'envoi d'e-mail n'est jamais sur le chemin critique de l'application (implémentation best-effort dans `EmailServiceImpl`) — sans ce flag, le healthcheck resterait `DOWN` en permanence en local/démo alors que l'application fonctionne normalement.

**Logging** : configuré uniquement via `logging.level` dans `application.yml`/`application-dev.yml` — pas d'agrégateur de logs (pas d'ELK, pas de Loki, pas de Sentry) configuré dans le dépôt. Niveau `INFO` par défaut pour `ma.iatacademy` (`application.yml` l.142), relevé à `DEBUG` (plus `org.springframework.security: DEBUG`) sur le profil `dev` (`application-dev.yml`). Aucune configuration d'appender de fichier ou d'export vers un système externe : les logs sortent sur la sortie standard du processus (comportement par défaut de Spring Boot).

Il n'y a donc pas de stack de monitoring (métriques, traces, alerting) au-delà du healthcheck HTTP `/actuator/health` et des healthchecks Docker natifs (`pg_isready`, `redis-cli ping`) déjà présents dans `docker-compose.yml`.

## 6.12 Questions possibles du jury — Infrastructure

**1. Pourquoi avoir choisi Docker/Docker Compose plutôt qu'une installation native des services ?**
Docker Compose isole les dépendances d'infrastructure (PostgreSQL 16, Redis 7) de la machine hôte, évite les conflits de version entre développeurs, et fournit des healthchecks natifs (`pg_isready`, `redis-cli ping`) qui garantissent que l'application ne démarre sa connexion qu'une fois la base réellement prête. C'est aussi la brique de base vers laquelle converge la conteneurisation complète prévue (API + frontend + Nginx), même si à ce jour seuls Postgres et Redis sont effectivement conteneurisés.

**2. Pourquoi le port PostgreSQL exposé est-il 5433 et non 5432 ?**
Pour éviter un conflit avec une éventuelle instance PostgreSQL déjà installée nativement sur la machine du développeur (le cas fréquent sous Windows), documenté explicitement dans `README.md`. Le port interne au conteneur reste `5432` (standard) ; seul le mapping hôte diffère.

**3. Comment les services communiquent-ils entre eux aujourd'hui, et comment est-ce prévu en cible ?**
Aujourd'hui : backend et frontend tournent en local (hors conteneur) et atteignent Postgres/Redis via `localhost` sur les ports publiés (5433, 6379). En cible (non encore active), la configuration Nginx (`deploy/nginx/conf.d/elearning.conf`) montre une résolution par nom de service Docker (`server api:8080;`, `server frontend:3000;`), ce qui suppose que ces trois services (api, frontend, nginx) rejoindraient un même réseau Docker Compose et se résoudraient via le DNS interne de Docker plutôt que par IP fixe.

**4. Comment la base de données est-elle connectée depuis le backend ?**
Via Spring Data JPA + un driver JDBC PostgreSQL, avec l'URL construite depuis la variable d'environnement `DB_URL` (par défaut `jdbc:postgresql://localhost:5433/iat_academy`), et les identifiants `DB_USER`/`DB_PASSWORD`. Les migrations de schéma sont gérées par Flyway (jamais par `ddl-auto`, qui est en mode `validate` uniquement) — le schéma réel de la base est donc toujours piloté par les fichiers versionnés dans `db/migration/`, jamais généré implicitement par Hibernate.

**5. Comment sont gérées les variables d'environnement (principe Twelve-Factor App) ?**
Toute la configuration sensible et dépendante de l'environnement (URL de base de données, secrets JWT, clés API IA, config Redis) est externalisée via des variables d'environnement lues par Spring avec des placeholders `${VAR:default}` dans `application.yml`, jamais codées en dur dans le code applicatif. Le fichier `.env.example` sert de gabarit versionné (sans valeurs réelles), tandis que `.env` (les vraies valeurs) est explicitement exclu de git (`.gitignore`). C'est directement l'esprit du facteur III de la Twelve-Factor App ("Store config in the environment"), même si le terme "Twelve-Factor" n'apparaît nulle part littéralement dans le code ou le rapport — le principe est appliqué, pas cité.

**6. Comment les secrets sont-ils sécurisés ?**
Aucun secret réel n'est commité : `.gitignore` exclut `.env`, `.env.local`, `.env.*.local`, ne laissant que `.env.example` (valeurs factices/vides) versionné. Le `JWT_SECRET` n'a **aucune valeur par défaut en production** (`application.yml` : `secret: ${JWT_SECRET:}`) — le commentaire du fichier précise que ceci est volontaire : l'application doit échouer au démarrage (fail-fast, voir `JwtProperties#validate`) plutôt que de signer silencieusement des tokens avec un secret par défaut qui serait visible en clair dans le dépôt. Seul le profil `dev` fournit un secret de repli, explicitement marqué "local-only" et "never used outside this profile".

**7. Comment déployer une nouvelle version de l'application ?**
Il n'existe pas aujourd'hui de procédure de déploiement automatisée ni de script dédié dans le dépôt : la seule procédure documentée est le démarrage local (`README.md`). La trajectoire anticipée par la configuration existante (Dockerfile backend prêt, configuration Nginx prête, bloc de service commenté dans `docker-compose.yml`) consisterait à construire les images Docker de l'API et du frontend, les démarrer via un `docker-compose.yml` étendu, et les exposer via le reverse proxy Nginx déjà configuré — mais cette étape reste à réaliser.

**8. Comment sont gérés les logs applicatifs ?**
Via la configuration standard `logging.level` de Spring Boot (sortie sur la console/stdout du processus), avec un niveau `INFO` en production et `DEBUG` (application + Spring Security) en profil `dev`. Il n'y a pas encore de centralisation des logs (pas d'ELK/Loki/équivalent) — c'est une piste d'amélioration pour un déploiement en production réel, où la sortie stdout des conteneurs devrait être collectée par un driver de logging Docker ou un agrégateur externe.

**9. Comment détecter et gérer une panne (ex. base de données indisponible) ?**
Au niveau infrastructure : les healthchecks Docker (`pg_isready`, `redis-cli ping`) permettent à Compose de connaître l'état de santé des conteneurs, et un futur service `api` dépendant de `postgres`/`redis` avec `condition: service_healthy` (déjà esquissé en commentaire dans `docker-compose.yml`) ne démarrerait qu'une fois ces dépendances prêtes. Au niveau applicatif : `/actuator/health` (seul endpoint Actuator exposé) donne un signal binaire UP/DOWN exploitable par un load balancer ou un orchestrateur, sans détailler les composants en panne à un appelant non authentifié (`show-details: never`), ce qui limite la fuite d'information tout en gardant un signal de supervision exploitable en interne.

**10. Comment l'application pourrait-elle être mise à l'échelle (scaling) ?**
Le design actuel s'y prête structurellement : le backend est stateless côté session (authentification par JWT en cookie httpOnly, pas de session serveur en mémoire), et l'état partagé nécessaire (rate limiting, verrous de progression) passe par Redis plutôt que par de la mémoire locale au processus — ce qui permettrait en théorie de faire tourner plusieurs instances de l'API derrière un load balancer sans perte de cohérence. Cela dit, aucune configuration de scaling horizontal (replicas Docker/Kubernetes, load balancer applicatif) n'existe aujourd'hui dans le dépôt : c'est une capacité permise par l'architecture, pas une fonctionnalité déployée.

**11. Quelle est la différence entre l'environnement de développement et l'environnement de production dans ce projet ?**
En développement : backend et frontend tournent en processus natifs (hors conteneur), avec `JWT_COOKIE_SECURE=false`, `SWAGGER_ENABLED=true`, logs `DEBUG`, et un secret JWT de repli fourni par le profil `dev`. En production (cible, non encore instanciée techniquement) : les mêmes variables d'environnement devraient être renseignées avec des valeurs différentes (`JWT_COOKIE_SECURE=true` derrière HTTPS, `SWAGGER_ENABLED=false` pour ne pas exposer Swagger publiquement, un `JWT_SECRET` fort obligatoire puisqu'il n'y a pas de valeur par défaut hors profil `dev`), et l'ensemble serait conteneurisé et placé derrière le reverse proxy Nginx qui terminerait le TLS — mais ce basculement n'a pas encore de topologie de déploiement active.

**12. Comment assurer la disponibilité du service (availability) ?**
Aujourd'hui, à l'échelle du projet (MVP académique), la disponibilité repose sur les healthchecks Docker au niveau infrastructure et sur `/actuator/health` au niveau applicatif, plus le caractère stateless du backend qui permettrait un redémarrage sans perte de session utilisateur (JWT porté par le client, pas de session serveur). Il n'existe pas de redondance active (pas de réplication Postgres, pas de cluster Redis, pas de multiple instances API) dans la configuration actuelle : la disponibilité au sens haute dispo (failover automatique, réplication multi-nœuds) reste une perspective d'évolution, cohérente avec le fait que l'hébergement de production lui-même (§6.9) n'est pas encore finalisé.
