# 3. Frontend — IAT Academy

Ce chapitre analyse le frontend de la plateforme IAT Academy (`frontend/`). Tous les extraits ci-dessous sont copiés tels quels depuis les fichiers réels du dépôt, chemin indiqué systématiquement — aucun code n'est inventé.

## 3.1 Architecture générale

Le frontend est une application **Next.js 15** (App Router, `frontend/src/app/`), en **TypeScript strict** (`"strict": true`, `frontend/tsconfig.json`), stylée avec **Tailwind CSS v4**. Extrait de `frontend/package.json` :

```json
"next": "^15.5.22", "react": "19.1.0", "react-dom": "19.1.0",
"react-hook-form": "^7.81.0", "@hookform/resolvers": "^5.4.0", "zod": "^4.4.3",
"axios": "^1.18.1", "tailwindcss": "^4"
```
```json
"dev": "next dev --turbopack", "build": "next build --turbopack",
"test": "vitest run", "test:e2e": "playwright test"
```

Le build passe par Turbopack (`--turbopack`), pas Webpack.

### Les deux shells

`frontend/src/app/` est organisé autour de **deux shells applicatifs distincts**, chacun avec son propre `layout.tsx` :

- `(admin)/admin/**` — espace staff (Formateur/Admin/Super Admin/Support), servi sous `/admin/...` (le groupe `(admin)` n'apparaît pas dans l'URL, convention Next.js).
- `app/**` — espace apprenant (Étudiant), servi sous `/app/...`.

À côté, des **pages publiques** sans layout protégé : `verify/[code]/` (vérification de certificat), `achievements/[code]/` (badge partageable), `tutor-signoff/[token]/` (validation de stage par un tuteur externe sans compte), `(auth)/` (login/register/forgot-reset-password/verify-email/complete-profile), `cgu/`.

Principe central (documenté dans le `CLAUDE.md` du repo) : *chaque `layout.tsx` de shell fournit l'auth-guarding et le chrome (sidebar/header) gratuitement — une nouvelle page déposée sous l'un des deux arbres n'a besoin d'aucun câblage supplémentaire.*

### Organisation des composants

`frontend/src/components/` est organisé **par domaine/propriétaire**, pas par type technique : `admin/` (sous-dossiers `dashboard/`, `forms/`, `media/`, `quiz/`, `tiptap/`, `ui/`), `learner/`, `ui/` (primitives partagées et agnostiques du shell : `Loader`, `Skeleton`, `ToastProvider`, `NotificationBell`…), `auth/`, `brand/`, `messaging/`, `stage/`, `account/`, `form/`, `legal/`, `landing/`, `common/`.

## 3.2 Pattern d'extraction de composants ("component-extraction")

Pour la logique partagée entre shells, le projet extrait un composant "core" sans chrome de page, consommé par une page fine spécifique à chaque rôle :

**`MessagingConsole`** (`frontend/src/components/messaging/MessagingConsole.tsx`) est importé à l'identique par les deux shells :

```tsx
// frontend/src/app/app/messages/page.tsx
import { MessagingConsole } from "@/components/messaging/MessagingConsole";
<MessagingConsole />
```
```tsx
// frontend/src/app/(admin)/admin/messages/page.tsx
import { MessagingConsole } from "@/components/messaging/MessagingConsole";
<MessagingConsole />
```

Le composant détecte lui-même le rôle de l'utilisateur connecté (`frontend/src/components/messaging/MessagingConsole.tsx`, lignes 73-75) plutôt que de le recevoir en prop :

```tsx
export function MessagingConsole() {
  const [me, setMe] = useState<User | null>(null);
  const isStaff = me?.role === "ADMIN" || me?.role === "SUPER_ADMIN" || me?.role === "FORMATEUR";
```

**`AccountSettingsPanel`** (`frontend/src/components/account/AccountSettingsPanel.tsx`) est consommé par `frontend/src/app/app/profile/page.tsx` : `<AccountSettingsPanel user={user} onUserChange={setUser} />`.

**Pourquoi ce pattern plutôt qu'une duplication entre shells ?** La logique métier est identique des deux côtés — seule la coquille visuelle diffère, déjà fournie par le `layout.tsx` parent. Dupliquer aurait doublé la surface de bug ; un composant unique garde une source de vérité unique.

## 3.3 Layouts et protection des routes

### Layout racine (`frontend/src/app/layout.tsx`)

Gère les polices (Poppins, Inter, JetBrains Mono, Cairo), un script inline d'initialisation du thème **avant hydratation**, l'enregistrement du service worker, et enveloppe l'app dans `Providers` :

```tsx
// frontend/src/app/layout.tsx (lignes 53-93, extrait)
const themeInitScript = `
(function(){
  try {
    var saved = localStorage.getItem('iat-theme');
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) { document.documentElement.classList.add('dark'); document.documentElement.style.colorScheme = 'dark'; }
    else { document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${poppins.variable} ${inter.variable} ${jetbrains.variable} ${cairo.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` est nécessaire car le script inline modifie la classe `dark` avant l'hydratation React — sans lui, React signalerait à tort une divergence serveur/client.

### Layout staff (`frontend/src/app/(admin)/admin/layout.tsx`)

C'est ici que se joue la **protection de route côté client** de tout le shell admin :

```tsx
// frontend/src/app/(admin)/admin/layout.tsx (lignes 12-31, extrait)
useEffect(() => {
  if (loading) return;
  if (!user) {
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return;
  }
  if (!hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR", "SUPPORT")) {
    router.replace("/app");
  }
}, [loading, user, hasRole, router, pathname]);

if (loading || !user || !hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR", "SUPPORT")) {
  return <PageLoader label="Vérification de session…" />;
}
// ... rendu du chrome (sidebar, header) puis {children}
```

À chaque montage : (1) tant que `loading`, on attend ; (2) pas d'utilisateur → redirection vers `/login?next=<page demandée>` (retour automatique après connexion) ; (3) utilisateur sans rôle staff → renvoyé vers `/app`. Un `PageLoader` remplace le contenu tant que la vérification n'a pas abouti, évitant un flash de contenu protégé.

**Pourquoi pas un middleware Next.js** (absent du projet) **?** Le JWT est en cookie httpOnly (invisible en JS) et le rôle réel n'est vérifiable qu'en appelant `/api/auth/me` côté Spring Boot — un middleware à l'edge devrait de toute façon faire cet appel réseau à chaque navigation, sans gain réel par rapport à la vérification au montage du layout. La vraie barrière de sécurité reste `@PreAuthorize` côté backend ; la garde frontend n'est qu'une question d'UX.

### Layout apprenant (`frontend/src/app/app/layout.tsx`)

Plus léger, il embarque deux comportements transverses :

```tsx
// frontend/src/app/app/layout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-horizon ${appSans.variable}`} style={{ fontFamily: "var(--font-body)" }}>
      <ProfileCompletionGuard />
      {children}
      <ChatbotWidget />
    </div>
  );
}
```

`ProfileCompletionGuard` (`frontend/src/components/learner/ProfileCompletionGuard.tsx`) ne rend rien (`return null`) mais redirige vers l'onboarding si le profil n'est pas complété :

```tsx
// frontend/src/components/learner/ProfileCompletionGuard.tsx (extrait)
/**
 * Filet de sécurité pour les comptes importés : la redirection après login couvre
 * le cas normal, mais un accès direct à /app (favori, session déjà ouverte) doit
 * lui aussi ramener vers l'onboarding tant que le profil n'est pas finalisé.
 * Le JWT ne portant pas cet état, la vérification ne peut pas se faire en middleware.
 */
export function ProfileCompletionGuard() {
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((user) => {
        if (!cancelled && user.profileCompleted === false) router.replace("/complete-profile");
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [router, pathname]);
  return null;
}
```

Le garde `let cancelled = false` est imposé par le Strict Mode de React (double-exécution des effets en dev) : sans lui, un composant démonté avant la fin de `getMe()` pourrait quand même rediriger une page qui n'est plus affichée.

## 3.4 Hooks personnalisés

`frontend/src/hooks/` contient deux fichiers : **`useAuth.tsx`** (contexte d'authentification global, détaillé en §3.6) et **`useUnreadMessagesCount.ts`** (compteur partagé entre les deux shells) :

```tsx
// frontend/src/hooks/useUnreadMessagesCount.ts (intégral)
const POLL_MS = 20_000;

/** Total unread messages across every conversation — polled for the header/sidebar badges,
 * shared between the learner and staff shells so neither has to open the messagerie to know. */
export function useUnreadMessagesCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const conversations = await listConversations();
        if (!cancelled) setCount(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
      } catch { /* silencieux — le prochain polling réessaiera */ }
    }
    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  return count;
}
```

**Pourquoi le polling plutôt que WebSocket/SSE ?** Il n'y a pas d'infrastructure temps réel côté Spring Boot — la messagerie est en HTTP classique. Un polling à 20s est le choix le moins coûteux pour un badge de notification (latence acceptable, contrairement à un chat temps réel). Le `try/catch` silencieux garantit qu'une erreur ponctuelle n'interrompt pas la boucle.

`useAuth` expose aussi `hasRole(...roles)`, `isAdmin`, `isSuperAdmin`, `isFormateur`, `isSupport`, utilisés pour l'affichage conditionnel (§3.8).

## 3.5 Client API centralisé

Toute communication HTTP passe par un client Axios unique (`api-client.ts`) puis des fonctions typées, une par endpoint, dans `api.ts` — règle du projet : *"single file with every typed API client function."*

### `api-client.ts` — socle Axios + intercepteur global d'erreurs

```ts
// frontend/src/lib/api-client.ts (intégral)
declare module "axios" {
  export interface AxiosRequestConfig {
    /** Caller already renders its own inline/graceful handling for this failure (e.g. a
     *  Promise.allSettled probe like "does this learner have a certificate yet?") — skip
     *  the global error toast so an expected, non-alarming outcome doesn't look like a bug. */
    skipErrorToast?: boolean;
  }
}

/** Central Axios client. JWT is stored in an httpOnly cookie by the Spring Boot API — never in localStorage. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export class ApiClientError extends Error {
  status: number;
  body: ApiErrorBody | null;
  constructor(status: number, message: string, body: ApiErrorBody | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data ?? null;
    const message = body?.message || body?.error ||
      (status === 401 ? "Identifiants invalides ou session expirée."
        : status === 403 ? "Accès refusé."
        : status === 429 ? "Trop de tentatives. Réessayez plus tard."
        : "Une erreur est survenue.");

    if (typeof window !== "undefined" && status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        window.location.href = `/login?next=${encodeURIComponent(path)}`;
      }
    } else if (!error.config?.skipErrorToast) {
      toast.error(message);
    }
    return Promise.reject(new ApiClientError(status, message, body));
  }
);
```

Un unique intercepteur gère toutes les erreurs HTTP : traduction du code HTTP en message français (priorité au message backend), redirection immédiate vers `/login?next=...` sur 401, sinon toast d'erreur global — sauf `skipErrorToast: true`, un flag ajouté via **déclaration de module** (`declare module "axios"`) pour étendre `AxiosRequestConfig` sans `any`. **Pourquoi un intercepteur global plutôt qu'un `try/catch` par composant ?** La règle du projet est "aucune erreur silencieuse" par défaut — un filet centralisé garantit qu'un développeur qui oublie de gérer une erreur obtient quand même un toast visible.

### `api.ts` — fonctions typées par endpoint

```ts
// frontend/src/lib/api.ts (lignes 83-130, extrait)
export async function login(email: string, password: string) {
  const { data } = await apiClient.post<User>("/api/auth/login", { email, password });
  return data;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}

export async function getMe() {
  const { data } = await apiClient.get<User>("/api/auth/me");
  return data;
}
```

Chaque fonction est un simple wrapper d'un seul appel `apiClient.get/post/put/delete`, générique en TypeScript, sans logique métier. **Pourquoi un fichier plat plutôt qu'une classe `ApiService` ?** Chaque fonction reste petite et testable isolément, et l'auto-complétion rend la découverte des endpoints triviale — c'est ce qui permet à `MessagingConsole` d'importer d'un coup neuf fonctions de messagerie sans rien instancier.

## 3.6 Gestion de l'état — Context API

Pas de Redux/Zustand/Jotai : la gestion d'état globale repose uniquement sur l'**API Context de React**, avec trois contextes réels : `frontend/src/hooks/useAuth.tsx` (session), `frontend/src/context/ThemeContext.tsx` (thème), `frontend/src/context/SidebarContext.tsx` (sidebar admin) — plus le bus de toasts hors React (§3.9).

```tsx
// frontend/src/hooks/useAuth.tsx (AuthProvider, extrait)
const refresh = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const me = await getMe();
    setUser(me);
  } catch (err) {
    setUser(null);
    if (err instanceof ApiClientError && err.status !== 401) setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => { void refresh(); }, [refresh]);

const value = useMemo<AuthContextValue>(
  () => ({
    user, loading, error, refresh, logout,
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    isSuperAdmin: user?.role === "SUPER_ADMIN",
    isFormateur: user?.role === "FORMATEUR" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    isSupport: user?.role === "SUPPORT",
    hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
  }),
  [user, loading, error, refresh, logout]
);
```

Au montage, `AuthProvider` appelle `getMe()` pour reconstituer la session. Un 401 est *volontairement ignoré* (`err.status !== 401`) : un visiteur non connecté sur la landing page n'est pas une erreur. `hasRole` est variadique (`...roles: Role[]`), ce qui permet `hasRole("SUPER_ADMIN", "ADMIN", "FORMATEUR", "SUPPORT")` dans le layout admin. Le `useMemo` évite de re-rendre tous les consommateurs si rien n'a changé.

**Pourquoi un Context maison plutôt qu'une lib de state management ?** L'état global est modeste (session, thème, sidebar), sans besoin de sélecteurs fins ni de state partagé complexe entre dizaines de features — ce que Redux/Zustand apportent surtout à plus grande échelle. Chaque hook lève une erreur explicite hors provider. Le reste (modules, conversations…) est local par page, sans cache global (pas de React Query/SWR dans `package.json`).

## 3.7 Authentification côté frontend

Le JWT est posé par Spring Boot dans un **cookie httpOnly**, jamais lu ni stocké en JavaScript (commentaire de `api-client.ts` : *"JWT is stored in an httpOnly cookie... never in localStorage"*). `withCredentials: true` garantit l'envoi automatique du cookie à chaque requête.

Flux de connexion, `frontend/src/components/auth/AuthBoardingPass.tsx` (composant réel derrière login/inscription) :

```tsx
// frontend/src/components/auth/AuthBoardingPass.tsx (lignes 69-100, extrait)
function redirectAfterLogin(user: { profileCompleted?: boolean; role: string }) {
  if (user.profileCompleted === false) { router.push("/complete-profile"); return; }
  const next = searchParams.get("next");
  if (next) { router.push(next); return; }
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "FORMATEUR" || user.role === "SUPPORT") {
    router.push("/admin");
  } else {
    router.push("/app");
  }
}

async function onSignIn(e: FormEvent) {
  e.preventDefault();
  try {
    const user = await login(email, password);
    redirectAfterLogin(user);
  } catch (err) {
    if (err instanceof ApiClientError && err.body?.error === "TOTP_REQUIRED" && err.body.pendingToken) {
      setPendingTotpToken(err.body.pendingToken);
      // ... bascule vers l'écran de saisie du code TOTP
```

Priorité de redirection : (1) profil incomplet → `/complete-profile` ; (2) paramètre `?next=` présent → on y retourne ; (3) redirection par rôle : staff → `/admin`, apprenant → `/app`. Le flux gère aussi le 2FA (TOTP) : sur `TOTP_REQUIRED`, bascule vers un écran de code avec le `pendingToken` fourni par l'API.

`frontend/src/components/auth/SignInForm.tsx` illustre une dépréciation propre :

```tsx
// frontend/src/components/auth/SignInForm.tsx (intégral)
/** @deprecated Use AuthBoardingPass — kept for import compatibility */
export default function SignInForm() {
  return <AuthBoardingPass initialMode="signin" />;
}
```

## 3.8 Protection des routes et permissions UI

Deux mécanismes : (1) garde impérative dans `layout.tsx` du shell admin (§3.3) ; (2) rendu conditionnel par rôle **à l'intérieur** des pages, via `useAuth()`. Exemple réel, `frontend/src/app/(admin)/admin/page.tsx` (lignes 22-27) :

```tsx
export default function AdminDashboardPage() {
  const { isAdmin, isSupport } = useAuth();
  if (isSupport) return <SupportDashboard />;
  if (!isAdmin) return <FormateurDashboard />;
  return <DirecteurDashboard />;
}
```

Ce composant ne contrôle pas l'accès (déjà garanti par le shell) — il **choisit** parmi trois tableaux de bord selon le rôle exact. Règle du projet : *le rôle conditionne l'affichage, jamais la sécurité* — la vraie barrière reste `@PreAuthorize` côté Spring Boot.

## 3.9 Gestion des erreurs

**1. Toasts globaux** — bus d'événements framework-agnostique, `frontend/src/lib/toast-store.ts` :

```ts
// frontend/src/lib/toast-store.ts (extrait)
/**
 * Framework-agnostic toast event bus. Lives outside React so non-component code
 * (e.g. the api-client.ts response interceptor) can push a toast without needing
 * hooks or context — ToastProvider just subscribes and renders whatever is here.
 */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  warning: (message: string) => push("warning", message),
  info: (message: string) => push("info", message),
  dismiss,
};
```

Consommé par `frontend/src/components/ui/ToastProvider.tsx` (`useEffect(() => subscribeToasts(setItems), [])`), monté dans `frontend/src/components/Providers.tsx`. **Pourquoi hors Context ?** Le déclencheur principal est l'intercepteur Axios, du code **hors arbre React** sans accès à `useContext`.

**2. Error boundary App Router** — `frontend/src/app/error.tsx` :

```tsx
// frontend/src/app/error.tsx (extrait)
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Diagnostic only — never rendered to the user, who only sees the generic
    // message below (no stack trace, no raw error text).
    console.error("Erreur applicative non gérée :", error);
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {/* titre générique + boutons Réessayer (reset()) / Retour à l'accueil */}
```

Le message brut/stack trace n'est **jamais** affiché, seulement loggé en console. **3. Page 404** — `frontend/src/app/not-found.tsx`, même structure visuelle, message et liens adaptés.

## 3.10 Formulaires et validation

Le shell admin (modules, quiz, questions) utilise **react-hook-form + Zod** (`@hookform/resolvers/zod`), schémas centralisés dans `frontend/src/components/admin/forms/schemas.ts` :

```ts
// frontend/src/components/admin/forms/schemas.ts (lignes 13-21)
export const moduleFormSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court").max(255),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  orderIndex: intField(0),
  published: z.boolean(),
  yearNumber: intField(1, 2),
  ufCode: z.string().trim().min(1, "UF requise").max(20),
  ufTitle: z.string().trim().min(2, "Titre UF trop court").max(255),
});
export type ModuleFormValues = z.output<typeof moduleFormSchema>;
```

Le schéma `quizSettingsSchema` utilise `.superRefine()` pour la **validation croisée entre champs** (lignes 55-58, extrait) :

```ts
.superRefine((data, ctx) => {
  if (data.quizType === "FIN_MODULE" && !data.moduleId) {
    ctx.addIssue({ code: "custom", message: "Sélectionnez un module", path: ["moduleId"] });
  }
  // ... règles similaires pour APPLICATIF, FIN_UF, FIN_ANNEE
```

Utilisation dans `frontend/src/components/admin/forms/ModuleForm.tsx` (lignes 39-47, extrait) :

```tsx
const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ModuleFormValues>({
  resolver: zodResolver(moduleFormSchema) as Resolver<ModuleFormValues>,
  mode: "onBlur",
  defaultValues: { title: "", orderIndex: 0, published: true, yearNumber: 1, ufCode: "UF 1", ...defaultValues },
});
```

`mode: "onBlur"` valide à la perte de focus plutôt qu'à chaque frappe. Une fonction utilitaire `intField(min, max)` (lignes 3-11) contourne un piège Zod classique avec les `<input type="number">` HTML, qui renvoient une string :

```ts
const intField = (min = 0, max?: number) => {
  let schema = z.number().int().min(min);
  if (max !== undefined) schema = schema.max(max);
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) ? n : val;
  }, schema);
};
```

Les formulaires d'authentification (`AuthBoardingPass.tsx`) utilisent en revanche une validation **manuelle** (`useState` par champ) — cohérent avec une logique d'état plus riche (signin/signup, TOTP, force du mot de passe) qui se prête moins à un schéma déclaratif. **Pourquoi react-hook-form + Zod pour l'admin ?** Les formulaires ont des règles nombreuses et croisées ; un schéma Zod centralisé les documente en un seul endroit, testable indépendamment du composant.

## 3.11 UI/UX — Loader, Skeleton, thème et dark mode

`frontend/src/components/ui/Loader.tsx` (intégral) :

```tsx
const DIAMETER: Record<LoaderSize, number> = { sm: 18, md: 32, lg: 52 };

/** Purely visual, like <Skeleton /> — wrap with role="status"/aria-label at the call site. */
export function Loader({ size = "md", tone = "brand", className = "" }: LoaderProps) {
  return (
    <span aria-hidden="true" className={`loader-ring loader-ring--${tone} inline-block shrink-0 ${className}`}
      style={{ width: DIAMETER[size], height: DIAMETER[size], ["--loader-stroke" as string]: `${STROKE[size]}px` }} />
  );
}

/** Full-page variant for blocking waits: auth gates, route transitions. */
export function PageLoader({ label = "Chargement…", className = "" }: PageLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={`app-horizon flex min-h-screen flex-col items-center justify-center gap-4 ${className}`}>
      <Loader size="lg" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
```

`Loader` a deux `tone` : `"brand"` (arc doré) et `"current"` (hérite la couleur du texte parent — utile dans un bouton doré, où un loader doré serait invisible). C'est ce `PageLoader` qu'affiche le layout admin pendant la vérification de session (§3.3).

`frontend/src/components/ui/Skeleton.tsx` (intégral) :

```tsx
export function Skeleton({ className = "h-24 rounded-2xl", card = false }: Props) {
  return <div aria-hidden="true" className={`animate-pulse bg-surface-2 ${card ? "card-theme " : ""}${className}`} />;
}
```

Contrairement à `Loader` (spinner générique), `Skeleton` mime la forme du contenu final pour réduire le layout shift perçu.

**Thème via CSS custom properties** (`frontend/src/app/globals.css`), pas de classes Tailwind conditionnelles dispersées :

```css
/* Class-based dark mode (TailAdmin-style), not only prefers-color-scheme */
@custom-variant dark (&:where(.dark, .dark *));

:root { --gold-500: #f5a623; --navy: #142b4b; --surface: #ffffff; --primary: #e08d1b; --primary-fg: #ffffff; }
.dark { --surface: #142033; --primary: #f5a623; --primary-fg: #0d1522; }
```

Le fichier définit aussi des **variantes de thème** commutables (`ocean-teal`, `sunset-amber`), chacune redéfinissant `--primary`/`--gold-*`/`--navy`. Règle du `CLAUDE.md` : *"never hardcode hex colors in a component; use the existing tokens... so dark mode / theme variants keep working for free."* Le dark mode est piloté par une classe (`html.dark`) persistée en `localStorage` (`frontend/src/context/ThemeContext.tsx`), pas uniquement par `prefers-color-scheme`.

## 3.12 Sécurité côté frontend

`frontend/next.config.ts` définit un CSP (Content-Security-Policy) documenté en commentaire :

```ts
// frontend/next.config.ts (extrait)
// 'unsafe-inline' on script-src is required for the small inline dark-mode-init
// script in app/layout.tsx (a static constant, not user input — see that file).
// Everything user-authored (lesson HTML) goes through DOMPurify before render
// (RichHtmlContent.tsx), so CSP here is defense-in-depth, not the primary guard.
const csp = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
  `frame-src 'self' ${API_URL} https://iframe.mediadelivery.net`,
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
```

Le rempart principal contre l'injection de HTML de leçon (généré par les formateurs) est **DOMPurify** ; le CSP n'est qu'une défense en profondeur secondaire. `frame-ancestors 'none'` empêche le clickjacking ; `frame-src` autorise l'API (aperçu PDF en iframe) et le lecteur vidéo Bunny.

Côté images, `next.config.ts` restreint les domaines externes pour `next/image` (`remotePatterns: [{ hostname: "images.unsplash.com" }]`). `next/image` est effectivement utilisé (`BrandLogo.tsx`, landing page), donnant l'optimisation automatique de Next.js — mais son usage systématique ailleurs n'a pas pu être vérifié exhaustivement (voir incertitudes en fin de rapport).

## 3.13 Choix techniques et justifications

| Choix | Où le vérifier | Pourquoi |
|---|---|---|
| Next.js 15 + Turbopack | `package.json` | Layouts imbriqués natifs pour chrome + auth guarding sans duplication entre shells. |
| TypeScript strict | `tsconfig.json` | Domaine complexe (rôles, statuts) partagé entre dizaines de pages ; erreurs attrapées à la compilation. |
| Tailwind v4 | `package.json` | Classes utilitaires + tokens CSS custom properties ; pas de CSS-in-JS runtime. |
| Axios plutôt que `fetch` | `lib/api-client.ts` | Intercepteurs indispensables pour centraliser la gestion d'erreur (§3.5). |
| react-hook-form + Zod | `admin/forms/schemas.ts` | Formulaires admin nombreux et croisés ; schéma testable indépendamment du composant. |
| Context API (pas de Redux) | `hooks/useAuth.tsx`, `context/` | Volume d'état global modeste ; une lib externe ajouterait de la complexité sans bénéfice. |
| JWT en cookie httpOnly | commentaire de `api-client.ts` | Empêche le vol de token via XSS — non lisible par le frontend. |
| Vitest + Playwright | `package.json` | Unitaire/composant rapide, e2e contre un vrai backend. |

---

## 3.14 Questions possibles du jury — Frontend

**Q1. Pourquoi Next.js plutôt que CRA ou Vue/Angular ?**
Le routing par fichiers avec layouts imbriqués natifs convient exactement aux deux shells : chaque `layout.tsx` porte son auth-guarding et son chrome une seule fois, hérité automatiquement par toute page en dessous — avec React Router sur une CRA j'aurais dû répéter la garde d'accès sur chaque route. Vue/Angular auraient été valides aussi, mais l'écosystème React (react-hook-form, Tiptap, dnd-kit) était plus familier.

**Q2. Comment fonctionne la gestion d'état globale ?**
Uniquement via l'API Context de React — pas de Redux ni Zustand. Trois contextes réels : `AuthProvider`, `ThemeProvider`, `SidebarProvider`, chacun avec un hook custom qui lève une erreur hors provider. Le reste (modules, conversations) est de l'état local par page, rechargé via `useEffect`.

**Q3. Comment l'authentification est gérée, où est stocké le token ?**
Le JWT n'est jamais manipulé côté JS : Spring Boot le pose en cookie httpOnly, le navigateur le renvoie automatiquement (`withCredentials: true`). Le frontend ne "voit" jamais le token — pas de vol possible via une lecture de localStorage. `AuthProvider` reconstruit la session au montage via `/api/auth/me`.

**Q4. Comment les appels à l'API backend sont-ils effectués ?**
Via Axios, une instance unique (`api-client.ts`) et des fonctions typées une par endpoint (`api.ts`) : `login()`, `getMe()`, `listConversations()`, etc. Aucune page n'appelle Axios directement.

**Q5. Comment les erreurs sont-elles gérées ?**
Trois niveaux : un intercepteur Axios global qui traduit le code HTTP en message et déclenche un toast (sauf 401, qui redirige vers le login) ; un `error.tsx` qui capture toute exception de rendu (message générique, jamais la stack trace) ; un `not-found.tsx`. Le bus de toasts est hors React car l'intercepteur Axios qui le déclenche n'a pas accès à `useContext`.

**Q6. Comment les routes sont-elles protégées selon le rôle ?**
Le layout du shell admin vérifie `loading`/`user`/`hasRole(...)` dans un `useEffect`, redirige vers `/login?next=...` si non connecté ou vers `/app` si rôle insuffisant, avec un `PageLoader` en attendant. C'est une protection côté client pensée pour l'UX — la vraie barrière reste `@PreAuthorize` côté Spring Boot.

**Q7. Pourquoi pas un middleware Next.js pour la protection des routes ?**
Un middleware à l'edge n'a accès ni au state React ni au rôle réel sans lui-même appeler `/api/auth/me` à chaque navigation — aucun gain par rapport à la vérification dans le layout, avec en plus la complexité de l'edge runtime.

**Q8. Comment la validation des formulaires est implémentée ?**
Pour l'admin (module, quiz, question) : react-hook-form + un schéma Zod, avec validation croisée via `.superRefine()` (ex. un quiz `FIN_MODULE` doit avoir un `moduleId`). Pour l'authentification : validation manuelle en `useState`, car ce flux a une logique d'état plus riche (signin/signup, TOTP) qui se prête moins à un schéma déclaratif.

**Q9. Pourquoi Tailwind plutôt que du CSS-in-JS ou du SCSS ?**
Tailwind évite un runtime de génération de styles au rendu. Combiné aux custom properties CSS pour les tokens de couleur, on garde les classes utilitaires pour la mise en page tout en gardant le thème piloté par CSS pur — un composant comme `Loader` n'a aucune couleur en dur.

**Q10. Comment les performances sont-elles optimisées ? SSR ? Images ?**
La majorité des pages sont `"use client"` et chargent leurs données via `useEffect` après montage — du CSR classique avec `Loader`/`Skeleton`, pas de SSR data-fetching observé pour ces pages. `next/image` est utilisé au moins pour le logo et la landing page, avec `remotePatterns` limité à un domaine externe. Turbopack accélère dev et build.

**Q11. Comment la sécurité frontend est assurée au-delà de l'authentification ?**
Cookie httpOnly pour le JWT, un CSP strict (`frame-ancestors 'none'` contre le clickjacking, origines limitées), et DOMPurify pour assainir le HTML généré par les formateurs avant rendu. DOMPurify est le rempart principal, le CSP une défense en profondeur secondaire (documenté en commentaire dans `next.config.ts`).

**Q12. Comment l'application pourrait-elle évoluer ?**
Remplacer le polling de `useUnreadMessagesCount` (20s) par du WebSocket/SSE si le volume grossit ; introduire React Query/SWR si l'état local par page re-fetche trop souvent ; étendre `next/image` à plus de composants. Le pattern d'extraction de composants reste la bonne direction pour toute fonctionnalité partagée entre shells.

**Q13. Pourquoi deux shells séparés plutôt qu'une arborescence unique ?**
Le chrome visuel, les gardes d'accès et les polices diffèrent assez entre staff et apprenant pour justifier deux `layout.tsx` distincts plutôt qu'un layout truffé de branches conditionnelles — cette séparation matérialise dans les dossiers la frontière de permissions du système.

**Q14. `MessagingConsole` détermine lui-même le rôle — redondant avec les shells ?**
Non : les shells décident *qui a le droit d'accéder à la page*, `MessagingConsole` décide *quel contenu afficher à l'intérieur* une fois l'accès validé (quels contacts proposer selon le rôle). Deux responsabilités distinctes ; les porter par le composant partagé évite de dupliquer `getMe()` dans chaque copie de page.
