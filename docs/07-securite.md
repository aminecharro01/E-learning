# 7. Sécurité

Ce document décrit exclusivement les mécanismes de sécurité **réellement implémentés** dans le backend Spring Boot d'IAT Academy, vérifiés par lecture directe du code (`backend/src/main/java/ma/iatacademy/api/`). Aucune protection n'est affirmée sans citation du fichier correspondant. Quand un mécanisme classique n'existe pas, cela est dit explicitement plutôt que passé sous silence.

Fichiers de référence : `config/SecurityConfig.java`, `security/{JwtService,JwtAuthenticationFilter,TotpService}.java`, `service/{AuthService,RateLimitService,MessagingService,NotificationService,LessonNoteService,StageService,StageSignoffService}.java`, `exception/GlobalExceptionHandler.java`, `resources/application.yml`.

---

## 1. Authentification

**Menace.** Un attaquant qui devine/vole des identifiants ou intercepte un jeton de session usurpe un compte.

**Protection.** Mot de passe BCrypt → JWT signé HS256 posé dans un cookie `httpOnly`, avec une 2FA TOTP optionnelle.

**Implémentation.** `AuthService.login()` authentifie via `AuthenticationManager`/`DaoAuthenticationProvider` puis pose le cookie :
```java
ResponseCookie cookie = ResponseCookie.from(jwtService.getCookieName(), token)
        .httpOnly(true).secure(jwtProperties.isCookieSecure())
        .sameSite("Lax").path("/")
        .maxAge(Duration.ofMillis(jwtService.getExpirationMs())).build();
```
La **2FA** est implémentée à la main dans `TotpService.java` (RFC 6238, HMAC-SHA1, 30s, 6 chiffres — compatible Google Authenticator/Authy), sans dépendance externe. Flux en deux étapes : si `user.isTotpEnabled()`, `login()` ne pose **aucun** cookie et lève `TotpRequiredException(jwtService.generatePendingTotpToken(...))` — un jeton de 5 min, jamais en cookie. `AuthController.verifyTotpLogin` → `AuthService.verifyLoginTotp()` valide le code contre `user.getTotpSecret()` avant de générer le vrai cookie. L'activation exige un code valide (`confirmTotp()`) avant de passer `totpEnabled=true`.

**Limites.** Le secret TOTP est stocké en clair en base (pas de chiffrement au repos). Aucune vérification contre une liste de mots de passe compromis (type HaveIBeenPwned).

---

## 2. Autorisation / RBAC

**Menace.** Un utilisateur accède à des fonctions réservées à un rôle supérieur.

**Protection.** Rôles fixes + hiérarchie Spring Security + `@PreAuthorize` par méthode (`@EnableMethodSecurity`).

**Implémentation.**
```java
public enum Role {
    SUPER_ADMIN, ADMIN, FORMATEUR, ETUDIANT, SUPPORT;
    public boolean isStaff() { return this == SUPER_ADMIN || this == ADMIN || this == FORMATEUR; }
}
```
```java
// SecurityConfig.java
@Bean
public RoleHierarchy roleHierarchy() {
    return RoleHierarchyImpl.fromHierarchy("ROLE_SUPER_ADMIN > ROLE_ADMIN");
}
```
Seule cette relation est déclarée — commentaire du code : *« this hierarchy makes every existing `@PreAuthorize("hasRole('ADMIN')")` pass for SUPER_ADMIN too »*. `FORMATEUR` et `SUPPORT` ne sont hiérarchisés avec personne ; leurs droits viennent uniquement des `@PreAuthorize("hasAnyRole(...)")` explicites (ex. `AdminController.java`).

**Limites.** `Role.SUPPORT` existe pleinement (modèle + contrôles d'accès : messagerie, lecture des statistiques), mais `AdminService.changeRole()` refuse toute promotion vers `SUPPORT` (« rôle non activé en MVP », `ch4_realisation.tex` §"Limites identifiées") — seul le compte de démo le porte. Vérifié toujours d'actualité.

---

## 3. Contrôle d'accès à granularité fine (au-delà du RBAC)

**Menace.** Le RBAC prouve un rôle, pas la propriété d'une ressource — c'est la classe **IDOR** (Insecure Direct Object Reference) : un élève changerait un UUID dans l'URL pour lire les données d'un autre.

**Protection.** Chaque service exposant une ressource privée vérifie explicitement la propriété, indépendamment du rôle.

**Implémentation.** `MessagingService.assertAccess()` :
```java
private void assertAccess(UUID conversationId, UserPrincipal principal) {
    Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new NotFoundException("Conversation introuvable."));
    if (conversation.getType() == ConversationType.COHORT_ROOM) {
        if (principal.getRole().isStaff()) return;
        User user = userRepository.findById(principal.getId()).orElse(null);
        boolean member = user != null && user.getGroup() != null
                && conversation.getGroup() != null && user.getGroup().getId().equals(conversation.getGroup().getId());
        if (!member) throw new ForbiddenException("Vous n'appartenez pas à cette cohorte.");
        return;
    }
    participantRepository.findByConversationIdAndUserId(conversationId, principal.getId())
            .orElseThrow(() -> new ForbiddenException("Cette conversation ne vous appartient pas."));
}
```
`NotificationService.markRead()` : `if (!notification.getUser().getId().equals(userId)) throw new ForbiddenException(...)`.

`LessonNoteService.requireOwnNote()` — même le staff n'a pas accès :
```java
/** jamais visible par un autre utilisateur, y compris le staff */
private LessonNote requireOwnNote(UUID noteId, UUID userId) {
    LessonNote note = noteRepository.findById(noteId).orElseThrow(() -> new NotFoundException("Note introuvable."));
    if (!note.getUser().getId().equals(userId)) throw new ForbiddenException("Cette note ne vous appartient pas.");
    return note;
}
```
`StageService.assertCanView()`/`assertCanUpload()` combine rôle + propriété : staff voit tous les dossiers, un élève seulement le sien ; le dépôt d'un document "élève" exige `principal.getId().equals(learnerId)`.

**Pourquoi le RBAC seul ne suffit pas.** `@PreAuthorize("hasRole('ETUDIANT')")` prouve seulement que l'appelant est *un* élève, pas que la ressource lui appartient — le contrôle de propriété doit vivre dans le service, sur la ressource chargée depuis la base.

**Limite identifiée (documentée dans `ch4_realisation.tex` §"Limites identifiées", vérifiée toujours vraie dans le code).** `AssignmentService.gradeSubmission()` et `.delete()` ne vérifient aucune propriété au-delà de `@PreAuthorize("hasAnyRole('ADMIN','FORMATEUR')")` : un formateur peut noter/supprimer un devoir d'un module qu'il n'encadre pas — IDOR réelle et assumée, non corrigée ici.

---

## 4. Protection des endpoints

**Menace.** Un endpoint sensible reste accessible sans authentification, ou un endpoint public expose plus que prévu.

**Protection.** Liste blanche restreinte dans `SecurityConfig`, tout le reste `authenticated()` ; les endpoints publics restants sont gardés par un token à usage unique expirant ou n'exposent que des données déjà publiques par nature.

**Implémentation.**
```java
.authorizeHttpRequests(auth -> auth
        .requestMatchers(publicPaths.toArray(new String[0])).permitAll()
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .anyRequest().authenticated())
```
`publicPaths` : login/register/mot de passe oublié/vérification email, `/api/public/contact`, `/api/public/newsletter`, `/api/public/stage-signoff/**`, `/api/certificates/verify/**`, `/api/badges/verify/**`, `/api/assets/*/file` et `/thumbnail`, `/documents/**` (templates statiques), `/actuator/health`, et Swagger si activé (voir §15).

Pourquoi chacun reste sûr :
- **`PublicStageSignoffController`** — commentaire du code : *« gated entirely by possession of an unguessable, single-use, expiring token »*. `StageSignoffService.requireValidInvite()` vérifie `usedAt == null` et `expiresAt.isAfter(now)` ; token = deux UUID concaténés (288 bits d'entropie) ; expire à 7 jours et devient inutilisable dès `signOff()` (`invite.setUsedAt(...)`).
- **`PublicBadgeController`** — page de partage volontairement publique (badge consultable via LinkedIn sans cookie), n'expose que nom + code, déjà destinés au partage.
- **`PublicLeadController`** — contact/newsletter, écriture seule, aucune lecture de données utilisateur.
- **`/api/certificates/verify/**`** — vérification d'authenticité par un tiers (recruteur), publique par nature.

**Limites.** Swagger (`/swagger-ui/**`, `/v3/api-docs/**`) public par défaut (`app.swagger.enabled:true`) — expose toute la surface d'API tant que `SWAGGER_ENABLED=false` n'est pas positionné en production.

---

## 5. Validation des entrées

**Menace.** Données malformées/trop longues corrompant l'état métier ou permettant des abus.

**Protection.** Bean Validation sur les DTO records, `@Valid` dans les contrôleurs, gestionnaire d'erreurs dédié.

**Implémentation.** `RegisterRequest.java` :
```java
public record RegisterRequest(
        @NotNull Civility civility,
        @NotBlank @Size(max = 255) String fullName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 100)
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                message = "Le mot de passe doit contenir au moins une lettre et un chiffre.")
        String password,
        @AssertTrue(message = "Vous devez accepter les conditions d'utilisation.") boolean termsAccepted
) {}
```
Toute violation est interceptée par `GlobalExceptionHandler.handleValidation()` → 400 avec détail champ par champ, jamais une trace serveur. Notable : `LoginRequest.email` n'a délibérément **pas** `@Email` (les comptes importés se connectent avec un matricule/CIN) — choix métier documenté.

**Limites.** Mot de passe : une lettre + un chiffre, 8 caractères minimum, pas de caractères spéciaux exigés — politique modeste mais assumée.

---

## 6. Protection contre les injections SQL

**Menace.** Concaténation de chaînes avec une entrée utilisateur → injection SQL.

**Protection.** JPA/Hibernate paramètre nativement les requêtes ; les 3 requêtes natives (`nativeQuery = true`) trouvées dans tout le code utilisent des paramètres liés, jamais de concaténation.

**Implémentation — les 3 fichiers vérifiés.** `QuizAttemptRepository` :
```java
@Query(value = "SELECT pg_advisory_xact_lock(hashtext(:lockKey))", nativeQuery = true)
void acquireStartLock(@Param("lockKey") String lockKey);
```
`MessageRepository` (listes d'UUID liées) et `LessonBlockRepository` (recherche plein texte) :
```java
WHERE l.published = true AND lb.block_type = 'TEXT'
  AND (lb.content ->> 'body') ILIKE CONCAT('%', :q, '%')
```
Le motif `%...%` est construit côté SQL avec un paramètre lié `:q`, jamais par assemblage de String côté Java. Aucune requête avec `+`/`String.format`/JDBC brut trouvée.

**Limites.** Aucune identifiée sur ce point.

---

## 7. Gestion des mots de passe

**Menace.** Hash faible ou absent → compromission massive en cas de fuite de la base.

**Protection.** `BCryptPasswordEncoder`.
```java
@Bean
public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
```
Utilisé partout : `register()` (`encode`), `changePassword()` (vérifie l'ancien via `.matches()`), `resetPassword()`, `completeProfile()` (rejette explicitement si le nouveau mot de passe == le mot de passe par défaut partagé).

**Limites.** Pas de rotation forcée ni de vérification contre une liste de mots de passe compromis. Le mot de passe par défaut des comptes importés (`APP_DEFAULT_RESET_PASSWORD`, défaut `IatReset@123`) est partagé tant que `completeProfile()` n'a pas été appelé — risque assumé, changement forcé au premier login.

---

## 8. Stockage des données sensibles

- Mot de passe : haché BCrypt, jamais en clair.
- Tokens de vérification/réinitialisation : `UUID.randomUUID()`, non prévisibles, TTL limité (24h / 1h), invalidés après usage (`setResetToken(null)`).
- **Secret TOTP** : stocké **en clair** en base (`AuthService.enableTotp()`) — une fuite de la base permettrait de régénérer les codes 2FA de tout compte l'ayant activée. Limite réelle, pas une protection.
- Fichiers uploadés (`backend/data/`, non versionné) : accès via URL signée à TTL limité (`MediaService`, `MEDIA_SIGNED_TTL` défaut 3600s), pas de chemin public direct.

**Limites.** Le secret TOTP en clair est la faiblesse la plus concrète de cette section.

---

## 9. CORS

**Menace.** Un site tiers effectue des requêtes authentifiées au nom de la victime.

**Protection.** Liste blanche d'origines par variable d'environnement, `allowCredentials(true)` restreint à ces origines (jamais de `*`).
```yaml
app.cors.allowed-origins: [ "${CORS_ORIGINS:http://localhost:3000}" ]
```
```java
config.setAllowedOrigins(corsProperties.getAllowedOrigins());
config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
config.setAllowCredentials(true);
```
Par défaut, seule `http://localhost:3000` est autorisée ; en production `CORS_ORIGINS` doit lister le(s) domaine(s) réel(s).

**Limites.** Aucune — configuration correcte pour une architecture SPA + cookie httpOnly.

---

## 10. CSRF

**Statut réel : explicitement désactivé.**
```java
http.csrf(csrf -> csrf.disable())
```
**Pourquoi c'est acceptable.** L'API est stateless (JWT), mais le cookie étant transmis automatiquement par le navigateur, le risque CSRF existe en principe. Il est mitigé par : `sameSite("Lax")` sur le cookie — non envoyé sur les requêtes cross-site en POST/PUT/PATCH/DELETE déclenchées par un site tiers, seule la navigation de premier niveau le transmet ; et la politique CORS (§9) qui bloque les origines non listées.

**Limite honnête.** `SameSite=Lax` n'équivaut pas à un jeton CSRF dédié (double-submit cookie, `X-CSRF-Token`). **Aucun jeton CSRF explicite** n'est implémenté — la protection repose entièrement sur `SameSite=Lax` + CORS.

---

## 11. XSS

**Protection réelle.** Le cookie JWT `httpOnly` empêche tout script injecté de lire `document.cookie` — protection directe contre le vol de session par XSS. Côté backend, les emails HTML échappent explicitement les variables utilisateur avant insertion :
```java
private static String escapeHtml(String value) {
    if (value == null) return "";
    return value.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
}
```
appliqué à `firstNameOrEmpty`, `learnerName`, `tutorName`, etc. Le frontend Next.js/React échappe par défaut le contenu inséré via `{variable}` en JSX (protection React standard) tant qu'aucun composant n'utilise `dangerouslySetInnerHTML` sans filtrage — ce point n'a **pas été audité fichier par fichier** dans le cadre de cette tâche (backend uniquement).

**Limites.** La CSP configurée (`SecurityConfig`) ne couvre que `frame-ancestors` (pour le viewer PDF en iframe), pas une CSP complète (`script-src`, etc.).

---

## 12. Gestion des sessions / tokens

**Protection.** Stateless (`SessionCreationPolicy.STATELESS`), JWT HS256 avec expiration vérifiée à chaque requête.
```java
public boolean isValid(String token) {
    try { return parseClaims(token).getExpiration().after(new Date()); }
    catch (Exception ex) { return false; }
}
```
`expiration-ms: ${JWT_EXPIRATION_MS:86400000}` — **24 heures par défaut**, valeur réelle. `JwtProperties.validate()` (`@PostConstruct`) refuse le démarrage si `JWT_SECRET` est absent ou fait moins de 32 octets (256 bits, minimum HS256). Le jeton "pending 2FA" a une durée volontairement courte (5 min) et une revendication `pending2fa` qui empêche son usage comme session normale.

**Limites.** Pas de révocation côté serveur (pas de blocklist Redis) : un JWT volé reste valide jusqu'à expiration même si le compte est désactivé entre-temps. Pas de refresh token.

---

## 13. Limitation de débit (Redis)

**Protection.** `RateLimitService`, compteur atomique Redis (`INCR`+`EXPIRE`), une limite par cas d'usage réel :

| Cas d'usage | Clé | Limite | Fenêtre |
|---|---|---|---|
| Connexion | `rate:login:<ip>` | 10 | 15 min |
| Inscription | `rate:register:<ip>` | 5 | 1 h |
| Réinit. mot de passe | `rate:password-reset:<ip>` | 5 | 1 h |
| Renvoi vérif. email | `rate:resend-verification:<ip>` | 5 | 1 h |
| Message | `rate:message:<userId>` | 30 | 1 min |
| Assistant IA | `rate:assistant:<userId>` | 20 | 5 min |
| Génération IA | `rate:ai-generation:<userId>` | 20 | 5 min |
| Upload | `rate:upload:<userId>` | 30 | 10 min |

```java
private void check(String key, int maxAttempts, Duration ttl, String message) {
    Long count = redisTemplate.opsForValue().increment(key);
    if (count != null && count == 1L) redisTemplate.expire(key, ttl);
    if (count != null && count > maxAttempts) throw new RateLimitException(message);
}
```
Anti-spoofing : `AuthController.resolveClientIp()` n'honore `X-Forwarded-For` que si la connexion directe vient d'une IP listée dans `TRUSTED_PROXIES`, sinon `request.getRemoteAddr()` — un attaquant ne peut pas contourner la limite en falsifiant l'en-tête.

**Limites.** **Aucun rate limiting global** sur l'ensemble des endpoints — seuls ces 8 cas d'usage sont protégés.

---

## 14. Gestion des erreurs

**Protection.** `GlobalExceptionHandler` centralise les réponses ; les exceptions non prévues restent génériques côté client.
```java
// jamais ex.getMessage() ici : trace JDBC/Java brute, en anglais, potentiellement des noms de colonnes
@ExceptionHandler(Exception.class)
public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
    log.error("Erreur interne non gérée", ex);
    return build(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur inattendue est survenue. Veuillez réessayer.");
}
```
`AccessDeniedException` (levée par `@PreAuthorize`) est interceptée pour un 403 propre plutôt qu'un 500. `forgotPassword()`/`resendVerification()` renvoient le même message que le compte existe ou non (anti-énumération).

**Limites.** `/actuator/health` public avec `show-details: never` — bien configuré, pas de fuite d'état des dépendances.

---

## 15. Protection des secrets

**Vérifié.** Tous les secrets transitent par variables d'environnement, jamais en dur :
```yaml
secret: ${JWT_SECRET:}                     # pas de défaut : démarrage refusé si absent
db.password: ${DB_PASSWORD:iat_secret}     # défaut = dev local uniquement
signing-secret: ${MEDIA_SIGNING_SECRET:}
api-key: ${GEMINI_API_KEY:} / ${GROK_API_KEY:} / ${BUNNY_API_KEY:}
```
`.gitignore` exclut `.env`, `.env.local`, `.env.*.local` (seul `.env.example` sans valeurs réelles est versionné). `StartupSecurityChecks` journalise un avertissement si l'app démarre hors profil `dev` avec `JWT_COOKIE_SECURE=false` ou `SWAGGER_ENABLED=true` — filet opérationnel, pas un blocage strict.

**Limites.** Aucun secret en dur trouvé. Seul résidu : la valeur par défaut de dev `DB_PASSWORD=iat_secret`, sans impact si l'environnement de production positionne bien la variable.

---

## 16. Isolation des données entre utilisateurs

**Protection.** Chaque service scope ses requêtes à `UserPrincipal.getId()`, jamais à un identifiant client non vérifié — exemples déjà détaillés au §3 (`assertAccess`, `requireOwnNote`, `assertCanView`). `LessonNoteService` va au-delà du RBAC : même le staff n'a accès à aucune note d'élève.

**Limite réelle (répétée du §3) :** `AssignmentService.gradeSubmission()`/`delete()` n'appliquent pas cet isolement — seule lacune confirmée, documentée dans `ch4_realisation.tex` §"Limites identifiées", toujours d'actualité.

---

## Récapitulatif — présent vs absent

| Mécanisme | Statut |
|---|---|
| JWT + cookie httpOnly | Implémenté |
| 2FA TOTP optionnelle | Implémentée (maison, RFC 6238) |
| RBAC + hiérarchie de rôles | Implémenté (`ROLE_SUPER_ADMIN > ROLE_ADMIN` uniquement) |
| Contrôle de propriété fin (anti-IDOR) | Implémenté (Messaging/Notification/LessonNote/Stage) — absent pour `AssignmentService` |
| Rôle SUPPORT promouvable via l'admin | Bloqué volontairement en MVP |
| Bean Validation | Implémentée |
| Requêtes SQL paramétrées | Vérifié, aucune concaténation |
| Hash BCrypt | Implémenté |
| CORS liste blanche | Implémenté |
| CSRF (jeton dédié) | Absent — mitigé par `SameSite=Lax` + CORS |
| XSS — cookie httpOnly | Implémenté |
| XSS — CSP complète | Partielle (`frame-ancestors` seulement) |
| Expiration JWT | 24h par défaut, configurable |
| Révocation de token serveur | Absente |
| Rate limiting ciblé (8 cas d'usage) | Implémenté (Redis) |
| Rate limiting global | Absent |
| Gestion d'erreurs sans fuite | Implémentée |
| Secrets en variables d'environnement | Vérifié, aucun secret en dur |
| Isolation des données | Implémentée, sauf `AssignmentService` |

---

## Questions possibles du jury — Sécurité

**Q1. Pourquoi un cookie httpOnly plutôt qu'un JWT en localStorage ?**
R. Un jeton en `localStorage` est lisible par tout script, y compris injecté via XSS — une seule faille suffirait à voler n'importe quelle session. En cookie `httpOnly` (`AuthService.attachJwtCookie`), le JavaScript ne peut jamais le lire. La contrepartie est une exposition théorique au CSRF, traitée à part avec `SameSite=Lax` (Q5).

**Q2. Tous les rôles sont-ils hiérarchisés ?**
R. Non, une seule relation : `ROLE_SUPER_ADMIN > ROLE_ADMIN`. `FORMATEUR` et `SUPPORT` ne sont hiérarchisés avec personne ; leurs droits viennent uniquement des `@PreAuthorize` explicites sur chaque endpoint.

**Q3. Le RBAC ne suffit-il pas à protéger les données d'un utilisateur ?**
R. Non — le RBAC prouve le rôle, pas la propriété de la ressource précise. Sans vérification de propriété, un élève changerait un UUID dans l'URL pour lire la note d'un autre (IDOR). D'où `LessonNoteService.requireOwnNote()`, qui compare `note.getUser().getId()` à l'appelant authentifié.

**Q4. Pourquoi le rôle SUPPORT n'apparaît-il pas dans l'admin ?**
R. Limite assumée et documentée au chapitre 4 : le modèle et les contrôles d'accès existent pleinement, mais `AdminService.changeRole()` refuse toute promotion vers `SUPPORT` en MVP — seul le compte de démo le porte.

**Q5. L'application est-elle protégée contre le CSRF ?**
R. La protection CSRF de Spring Security est désactivée (`csrf.disable()`), l'API étant stateless. Le risque résiduel du cookie transmis automatiquement est mitigé par `SameSite=Lax` (pas envoyé sur POST/PUT/DELETE cross-site) et par CORS. Ce n'est pas équivalent à un jeton CSRF dédié, et aucun n'est implémenté.

**Q6. Comment la 2FA est-elle implémentée ?**
R. TOTP (RFC 6238) codé à la main dans `TotpService.java` (HMAC-SHA1, 30s, 6 chiffres, compatible Google Authenticator). Login à deux étapes : si `totpEnabled`, aucun cookie n'est posé, un jeton "pending2fa" de 5 minutes est renvoyé, à échanger contre le vrai cookie via `/api/auth/verify-2fa` après validation du code.

**Q7. Quel algorithme protège les mots de passe ?**
R. `BCryptPasswordEncoder` — salage automatique intégré, facteur de coût qui ralentit délibérément une attaque par force brute hors ligne en cas de fuite de la base.

**Q8. Comment fonctionne le rate limiting, et sur quoi ?**
R. `RateLimitService` (Redis, `INCR`+`EXPIRE`) protège 8 cas précis : login (10/15min/IP), inscription (5/h/IP), réinit. mot de passe (5/h/IP), messages (30/min/user), assistant IA et génération IA (20/5min/user), upload (30/10min/user). Aucun rate limiting générique sur le reste de l'API.

**Q9. Le rate limiting par IP peut-il être contourné via X-Forwarded-For ?**
R. Non — cet en-tête n'est honoré que si la connexion directe vient d'une IP listée dans `TRUSTED_PROXIES` (vide par défaut) ; sinon `request.getRemoteAddr()` est utilisé, non falsifiable côté client.

**Q10. Les requêtes SQL natives sont-elles vulnérables à l'injection ?**
R. Les 3 fichiers concernés (`QuizAttemptRepository`, `MessageRepository`, `LessonBlockRepository`) utilisent tous des paramètres liés Spring Data (`:param`), y compris la recherche plein texte où `CONCAT('%', :q, '%')` est construit côté SQL, jamais par concaténation Java.

**Q11. Comment les secrets sont-ils protégés ?**
R. Tous en variables d'environnement (`${VAR:defaut}`), aucun en dur. `JWT_SECRET` n'a même pas de valeur par défaut — `JwtProperties.validate()` refuse le démarrage sans elle. `.env` réel exclu de Git, seul `.env.example` est versionné.

**Q12. Un JWT volé peut-il être révoqué ?**
R. Non — pas de blocklist côté serveur ; un JWT volé reste valide jusqu'à expiration (24h par défaut). Compromis assumé de l'architecture stateless ; une blocklist Redis serait l'amélioration naturelle.

**Q13. Un formateur peut-il voir les notes personnelles d'un élève ?**
R. Non — `LessonNoteService` scope chaque accès au `user_id` de l'appelant, sans exception pour le staff, contrairement à `MessagingService`/`StageService` où le staff a un accès élargi légitime.

**Q14. Quelles limites de sécurité reconnaissez-vous ?**
R. Trois, toutes vérifiées : `AssignmentService.gradeSubmission()`/`delete()` ne vérifient que le rôle, pas la propriété du module ; le secret TOTP est stocké en clair ; il n'existe pas de rate limiting générique sur l'ensemble de l'API. La première est documentée explicitement au chapitre 4 du rapport.
