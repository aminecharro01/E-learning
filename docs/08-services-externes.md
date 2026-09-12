# 08 — Services externes

Ce document recense les **seuls** services tiers réellement appelés par le code
d'IAT Academy. Chaque service a été vérifié par lecture directe des fichiers
source cités — aucune supposition à partir d'un nom de dépendance, aucune clé
API réelle exposée ci-dessous.

## Vue d'ensemble

| Service | Rôle | Obligatoire ? | Config |
|---|---|---|---|
| Google Gemini | Génération IA (questions de quiz + assistant de cours) | Non — désactivé si clé absente | `AiProviderProperties.java` |
| xAI Grok | Repli IA si Gemini indisponible/non configuré | Non — désactivé si clé absente | `AiProviderProperties.java` |
| SMTP générique (`spring-boot-starter-mail`) | E-mails transactionnels + campagnes | Non — mode « log seulement » par défaut | `EmailProperties.java` |
| Bunny Stream | Hébergement/diffusion vidéo (CDN + lecteur) | Non — repli sur disque local | `BunnyStreamProperties.java` |

Aucun autre service externe trouvé : `backend/pom.xml` ne contient aucun SDK
tiers payant (pas de Stripe, Twilio, SendGrid, AWS SDK, Firebase) et
`frontend/package.json` ne référence que `axios` comme client HTTP générique.

## 1. Google Gemini (IA — fournisseur principal)

**Rôle.** Génération automatique de questions de quiz à partir d'une leçon
(`QuestionGenerationService.java`) et assistant pédagogique répondant à partir
du contenu de cours déjà publié (`CourseAssistantService.java`, RAG « pauvre »
par mots-clés, sans embeddings ni base vectorielle).

**Communication.** POST HTTP synchrone via `RestClient` (pas de SDK) :
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}
```
Corps : `{"contents":[{"parts":[{"text":"<prompt>"}]}], "generationConfig":{...}}`.
Réponse lue à `/candidates/0/content/parts/0/text`.

**Données échangées.** Le prompt contient le texte de la leçon (HTML retiré) ou
la question de l'apprenant — jamais d'identifiant, d'email ou de donnée de
compte. La réponse est un JSON de questions ou un texte pédagogique.

**Code.** `config/AiProviderProperties.java` ; `service/QuestionGenerationService.java`
(`callGemini`, ~L120) ; `service/CourseAssistantService.java` (`callGemini`, ~L226) ;
tests : `QuestionGenerationServiceTest.java`, `CourseAssistantServiceTest.java`.

**Configuration** (`.env.example`) :
```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
```
Un fournisseur est « configuré » **dès que sa clé est non vide**
(`isConfigured()` teste uniquement `apiKey != null && !apiKey.isBlank()`) —
**aucun flag `enabled` séparé**, contrairement à Bunny Stream ou au mail.

**Risques / alternatives.** Panne/quota Google → IA indisponible tant que Grok
ne prend pas le relais ; coût par appel contenu côté application
(`RateLimitService`), pas côté fournisseur ; le texte de cours transite par un
tiers américain. Alternative : OpenAI GPT, ou un modèle open-source
auto-hébergé (Llama/Mistral via Ollama) au prix d'une infra GPU.

## 2. xAI Grok (IA — fournisseur de repli)

**Rôle.** Repli automatique si Gemini échoue ou n'est pas configuré, pour les
deux mêmes usages. Aucune fonctionnalité n'est exclusive à Grok.

**Communication.**
```
POST https://api.x.ai/v1/chat/completions
Authorization: Bearer {GROK_API_KEY}
```
Corps au format Chat Completions standard ; réponse lue à
`/choices/0/message/content`.

**Données échangées.** Identiques à Gemini (même prompt réutilisé en repli).

**Code.** `AiProviderProperties.java` (classe `Grok`) ; `QuestionGenerationService.callGrok`
(~L140) ; `CourseAssistantService.callGrok` (~L243).

**Configuration.**
```
GROK_API_KEY=
GROK_MODEL=grok-2-latest
```
Même règle de configuration implicite que Gemini.

**Risques / alternatives.** Mêmes catégories que Gemini, mais risque combiné
plus faible (il faut que les deux fournisseurs soient indisponibles
simultanément). Alternative : Anthropic Claude, ou Mistral AI (fournisseur
européen, pertinent pour une contrainte de souveraineté des données).

## 3. Pattern de repli Gemini → Grok

Implémenté à l'identique dans `QuestionGenerationService.generate()` et
`CourseAssistantService.ask()` :
1. Aucun fournisseur configuré → `ApiException` immédiate, sans appel réseau.
2. Gemini tenté en premier si configuré ; toute exception est capturée et
   journalée (`log.warn`), puis Grok est tenté s'il est configuré.
3. Si Grok échoue aussi (ou n'est pas configuré) → `ApiException` finale.

Les méthodes `callGemini`/`callGrok` sont **package-private (non `private`)**
dans les deux services, pour que les tests fassent `Mockito.spy()` sur
l'instance réelle et stubbent uniquement l'appel réseau
(`doReturn(...).when(service).callGemini(...)`), sans jamais contacter les API
réelles en CI.

## 4. Envoi d'e-mails (SMTP générique)

**Rôle.** Vérification d'adresse à l'inscription, réinitialisation de mot de
passe, notifications, et campagnes email en masse (`EmailCampaignService`,
`CampaignSenderWorker`).

**Communication.** Aucun service tiers propriétaire (pas de SendGrid, Mailgun,
Postmark) : `spring-boot-starter-mail` standard, SMTP brut via `JavaMailSender`
— le fournisseur réel dépend uniquement de l'hôte SMTP configuré.

**Données échangées.** Adresse destinataire, sujet, corps HTML. Si
`MAIL_ENABLED=false`, rien n'est envoyé : le message est journalisé
(`log.info("[DEV MAIL] ...")`) — voir `EmailServiceImpl.send()`.

**Code.** `config/EmailProperties.java` ; `service/EmailServiceImpl.java` ;
`service/EmailCampaignService.java` ; `service/CampaignSenderWorker.java`
(envoi asynchrone throttlé, `Thread.sleep(200)` entre deux destinataires pour
ne pas saturer le serveur SMTP) ; `application.yml` (`spring.mail.*`, `app.mail.*`).

**Configuration.**
```
MAIL_ENABLED=false
MAIL_FROM=no-reply@iat-academy.local
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
FRONTEND_BASE_URL=http://localhost:3000
```
`MAIL_HOST/PORT/USERNAME/PASSWORD` sont lus par `application.yml` mais
**absents de `.env.example`** (seul `MAIL_ENABLED` y figure) — voir « Écarts ».

**Risques / alternatives.** Dépendance à la disponibilité/réputation du serveur
SMTP choisi ; risque de liste noire si le volume croît sans SPF/DKIM (hors
périmètre du code). Alternative : SendGrid, Mailgun, Amazon SES — le contrat
`JavaMailSender` resterait identique, seule la config SMTP changerait.

## 5. Bunny Stream (hébergement vidéo)

**Rôle.** Diffusion des vidéos de cours en streaming adaptatif (HLS) via un
CDN, avec miniatures automatiques et lecteur intégré, plutôt que de servir des
fichiers bruts depuis le disque du serveur.

**Communication.** REST vers l'API Bunny Stream (`docs.bunny.net/api-reference/stream`),
sans SDK :
- `POST .../library/{libraryId}/videos` (création, header `AccessKey`) → GUID
- `PUT .../library/{libraryId}/videos/{guid}` (upload des octets)
- `DELETE .../library/{libraryId}/videos/{guid}` (suppression)
- `GET https://{pullZoneHostname}/{guid}/thumbnail.jpg` avec header
  `Referer: https://iframe.mediadelivery.net/` (contournement du hotlink-protection
  de la pull zone — sans ce header une requête directe reçoit un 403, confirmé
  en conditions réelles selon le commentaire du code)
- Lecture : `https://iframe.mediadelivery.net/embed/{libraryId}/{guid}` (lecteur
  hébergé Bunny) ou l'URL HLS directe `.../{guid}/playlist.m3u8`

**Données échangées.** Uniquement le fichier vidéo et son titre — aucune donnée
personnelle transmise.

**Code.** `config/BunnyStreamProperties.java` ; `service/BunnyStreamClient.java` ;
`service/MediaService.java` (point de branchement Bunny / disque local).

**Configuration.**
```
BUNNY_STREAM_ENABLED=false
BUNNY_LIBRARY_ID=
BUNNY_API_KEY=
BUNNY_PULL_ZONE_HOSTNAME=
```
Contrairement à Gemini/Grok, Bunny a un **flag `enabled` explicite** distinct
des clés — l'activer change durablement où les nouvelles vidéos sont stockées,
un effet de bord qu'une clé mal renseignée seule ne doit pas déclencher. Un
message est journalisé au démarrage (`logConfigOnStartup`) si un champ requis
manque alors que `enabled=true`.

**Risques / alternatives.** Pas de repli automatique si Bunny est en panne alors
qu'il est activé ; coût au Go stocké/diffusé. Alternative : auto-hébergement
HLS (`ffmpeg` + S3/MinIO), ou Mux/Cloudflare Stream.

## Écarts avec le rapport existant (`rapport_latex/`)

- **Cohérent** : le repli Gemini → Grok est décrit avec les mêmes noms de
  méthode et la même logique de configuration implicite (ch5, ~L173).
- **Cohérent** : les campagnes email asynchrones et leur limitation de débit
  sont mentionnées (ch4/ch5, « jamais saturer le serveur SMTP »).
- **Écart — Bunny Stream non nommé.** Le rapport ne mentionne l'hébergement
  vidéo que génériquement (« hébergement vidéo », ch5 L224) sans jamais citer
  Bunny Stream, ni son fonctionnement en deux étapes, son flag `enabled`
  explicite, ou son repli sur disque local. Ce document comble l'écart (§5).
- **Écart mineur — variables SMTP absentes de `.env.example`.** `MAIL_HOST`,
  `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` sont lues par `application.yml`
  mais absentes de `.env.example` (incohérence interne au dépôt, pas au
  rapport LaTeX).
- Aucun service mentionné dans le rapport n'est absent du code actuel.

## Questions possibles du jury — Services externes

**Q1. Pourquoi Gemini ET Grok plutôt qu'un seul fournisseur ?**
Pour éviter qu'une panne, une limite de quota ou un changement tarifaire chez
un seul fournisseur ne rende la génération de questions ou l'assistant
totalement indisponibles. Gemini est tenté en premier, Grok prend le relais
automatiquement en cas d'échec.

**Q2. Que se passe-t-il si les deux sont indisponibles ?**
Chaque échec est capturé et journalisé sans interrompre le reste de
l'application ; si les deux échouent, l'appelant reçoit une `ApiException`
explicite traduite en message d'erreur côté frontend — l'IA est un module
isolé, aucune autre fonctionnalité (cours, quiz, messagerie) n'est affectée.

**Q3. Comment le coût est-il maîtrisé ?**
Par `RateLimitService` (Redis) : `checkAssistantAllowed` (20 questions/5 min
par apprenant) et `checkAiGenerationAllowed` (20 générations/5 min), qui
plafonnent l'usage indépendamment des limites du fournisseur.

**Q4. Pourquoi ces services sont-ils optionnels plutôt qu'obligatoires ?**
Pour qu'un environnement de dev/démo démarre sans clé payante : clé vide ⇒
fonctionnalité désactivée proprement (erreur explicite, pas de crash). Même
principe pour Bunny (`enabled=false` par défaut) et le mail (`MAIL_ENABLED=false`,
messages journalisés).

**Q5. Pourquoi Gemini/Grok n'ont-ils pas de flag `enabled` séparé, contrairement
à Bunny ?**
Activer/désactiver l'IA n'a aucun effet de bord persistant (au pire l'appel
échoue proprement). Bunny détermine où une vidéo est physiquement stockée : un
flag mal positionné ferait basculer silencieusement le stockage de tout
nouvel upload, d'où le garde-fou explicite en plus des clés.

**Q6. Comment tester ces intégrations sans clé API réelle ?**
`callGemini`/`callGrok` sont package-private, ce qui permet à
`Mockito.spy()` de stubber uniquement l'appel réseau
(`doReturn(...).when(service).callGemini(...)`) pendant que le reste (parsing,
repli) s'exécute réellement — voir `QuestionGenerationServiceTest.java` et
`CourseAssistantServiceTest.java`, qui ne contactent jamais Google ni xAI.

**Q7. Quelles données sensibles transitent vers ces services ?**
Vers Gemini/Grok : texte de leçon ou question de l'apprenant, jamais
d'identifiant ni d'email. Vers Bunny : fichier vidéo et titre uniquement. Vers
le SMTP : l'adresse email du destinataire et le contenu du message — la seule
intégration transportant une donnée personnelle identifiante.

**Q8. Quelles alternatives existeraient ?**
IA : modèle open-source auto-hébergé (Ollama) pour supprimer la dépendance
externe. Email : SendGrid/SES/Mailgun sans changer le contrat `JavaMailSender`.
Vidéo : auto-hébergement HLS + S3/MinIO, ou Mux/Cloudflare Stream.

**Q9. Pourquoi appeler Gemini/Grok directement en HTTP plutôt qu'une couche
d'orchestration LLM ?**
Le besoin (prompt → JSON de questions ou texte de réponse) ne justifiait pas la
complexité d'une couche supplémentaire ; deux appels `RestClient` directs
suffisent et restent testables sans SDK propriétaire additionnel.

**Q10. L'assistant peut-il halluciner ou répondre hors sujet ?**
Réduit par construction : le prompt contient explicitement les extraits de
cours retrouvés par mot-clé et l'instruction de dire clairement l'absence
d'information plutôt que d'inventer une réponse (`CourseAssistantService.buildPrompt`).
Le filtrage par progression pédagogique empêche en plus de citer un contenu
que l'apprenant n'a pas encore débloqué.
