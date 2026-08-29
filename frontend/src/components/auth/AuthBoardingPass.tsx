"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { login, register, verifyTotpLogin } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { IconHome, IconPlane } from "@/components/brand/IatIcons";
import { EyeCloseIcon, EyeIcon } from "@/components/auth/AuthIcons";
import { passwordStrengthLabel } from "@/components/auth/AuthRunwaySubmit";
import { iat } from "@/components/landing/content";
import "./auth-boarding.css";

export type AuthMode = "signin" | "signup";

type Props = {
  initialMode?: AuthMode;
};

const EDUCATION_LEVELS = ["Bac", "Bac+1", "Bac+2", "Bac+3", "Autre"] as const;

const SCHOOL_TYPES = ["Public", "Privé"] as const;

export default function AuthBoardingPass({ initialMode = "signin" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [civility, setCivility] = useState<"MR" | "MME" | "">("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [lastSchoolType, setLastSchoolType] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingTotpToken, setPendingTotpToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const strength = useMemo(() => passwordStrengthLabel(password), [password]);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSignupDone(false);
  }, [initialMode]);

  function switchMode(next: AuthMode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setSignupDone(false);
    setShowPassword(false);
    const qs = searchParams.get("next");
    const path = next === "signup" ? "/register" : "/login";
    const href = qs ? `${path}?next=${encodeURIComponent(qs)}` : path;
    if (pathname !== path) {
      router.replace(href);
    }
  }

  function redirectAfterLogin(user: { profileCompleted?: boolean; role: string }) {
    // Compte importé qui n'a pas encore finalisé sa 1ʳᵉ connexion : on force
    // l'onboarding avant tout, y compris avant un éventuel ?next=.
    if (user.profileCompleted === false) {
      router.push("/complete-profile");
      return;
    }
    const next = searchParams.get("next");
    if (next) {
      router.push(next);
      return;
    }
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.role === "FORMATEUR" || user.role === "SUPPORT") {
      router.push("/admin");
    } else {
      router.push("/app");
    }
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      void keepLoggedIn;
      redirectAfterLogin(user);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.body?.error === "TOTP_REQUIRED" && err.body.pendingToken) {
          setPendingTotpToken(err.body.pendingToken);
          setError(null);
        } else if (err.status === 401) setError("Identifiants incorrects.");
        else if (err.status === 429) setError("Trop de tentatives. Réessayez dans 15 minutes.");
        else if (
          err.message.toLowerCase().includes("activation") ||
          err.message.toLowerCase().includes("attente")
        ) {
          setError(
            "Compte en attente d'activation par le directeur (après paiement)."
          );
        } else setError(err.message);
      } else {
        setError("Serveur indisponible.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyTotp(e: FormEvent) {
    e.preventDefault();
    if (!pendingTotpToken) return;
    setError(null);
    setLoading(true);
    try {
      const user = await verifyTotpLogin(pendingTotpToken, totpCode.trim());
      redirectAfterLogin(user);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Serveur indisponible.");
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!civility) {
      setError("Veuillez indiquer votre civilité.");
      return;
    }
    if (!accepted) {
      setError("Veuillez accepter les conditions générales d'utilisation.");
      return;
    }
    setLoading(true);
    try {
      await register({
        civility,
        fullName: fullName.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
        educationLevel,
        lastSchoolType,
        password,
        termsAccepted: true,
      });
      setSignupDone(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Inscription impossible. Vérifiez les informations."
      );
    } finally {
      setLoading(false);
    }
  }

  const gateCode = mode === "signin" ? "IN" : "UP";
  const flightCode = mode === "signin" ? "IAT · CONNEXION" : "IAT · INSCRIPTION";

  return (
    <div className="iat-board auth-board">
      <div className="auth-board-bg" aria-hidden />

      <Link href="/" className="auth-board-home" aria-label="Retour à l'accueil">
        <IconHome size={20} />
      </Link>

      <section
        className={`boarding-pass auth-pass ${mode === "signup" ? "auth-pass-wide is-signup" : ""}`}
        aria-label="Embarquement compte"
      >
        <div className="bp-main">
          <span className="bp-eyebrow">
            <IconPlane size={14} />
            Porte d&apos;embarquement
          </span>

          <div className="auth-pass-tabs" role="tablist" aria-label="Mode d'accès">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`auth-pass-tab ${mode === "signin" ? "is-active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Connexion
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`auth-pass-tab ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Inscription
            </button>
          </div>

          {signupDone ? (
            <div className="auth-pass-success">
              <h1 className="bp-title">
                Inscription <span className="grad">reçue</span>
              </h1>
              <p className="bp-sub">
                Compte créé — en attente d&apos;activation par le directeur après paiement.
              </p>
              <dl className="bp-meta">
                <div>
                  <dt>Passager</dt>
                  <dd>{fullName}</dd>
                </div>
                <div>
                  <dt>Courriel</dt>
                  <dd className="auth-pass-email">{email}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>En attente</dd>
                </div>
              </dl>
              <button
                type="button"
                className="auth-pass-submit"
                onClick={() => switchMode("signin")}
              >
                Aller à la connexion
              </button>
            </div>
          ) : (
            <>
              <h1 className="bp-title">
                {mode === "signin" ? (
                  <>
                    Accès <span className="grad">à bord</span>
                  </>
                ) : (
                  <>
                    Réserver <span className="grad">votre place</span>
                  </>
                )}
              </h1>
              <p className="bp-sub">
                {mode === "signin"
                  ? "Connectez-vous pour reprendre votre parcours apprenant ou formateur."
                  : "Créez votre compte — activation par l'académie après paiement."}
              </p>

              {error && (
                <p className="auth-pass-alert" aria-live="polite">
                  {error}
                </p>
              )}

              {mode === "signin" ? (
                pendingTotpToken ? (
                <form onSubmit={onVerifyTotp} className="auth-pass-form">
                  <div className="auth-pass-field">
                    <label htmlFor="auth-totp">Code de vérification</label>
                    <input
                      id="auth-totp"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                      placeholder="123456"
                    />
                    <p className="mt-1 text-xs text-muted">Ouvrez votre application d&apos;authentification.</p>
                  </div>
                  <button type="submit" disabled={loading || totpCode.length !== 6} className="auth-pass-submit">
                    {loading ? "Vérification…" : "Valider"}
                  </button>
                  <button
                    type="button"
                    className="auth-pass-forgot mt-2"
                    onClick={() => {
                      setPendingTotpToken(null);
                      setTotpCode("");
                    }}
                  >
                    Retour
                  </button>
                </form>
                ) : (
                <form onSubmit={onSignIn} className="auth-pass-form">
                  <div className="auth-pass-field">
                    <label htmlFor="auth-email">Courriel ou matricule</label>
                    {/* type="text" et non "email" : les apprenants présentiel se
                        connectent avec leur CIN/matricule tant qu'ils n'ont pas
                        finalisé leur profil — type="email" les bloquerait côté
                        navigateur avant même la soumission. */}
                    <input
                      id="auth-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                      spellCheck={false}
                      placeholder="vous@email.com ou CIN"
                    />
                  </div>
                  <div className="auth-pass-field">
                    <div className="auth-pass-label-row">
                      <label htmlFor="auth-password">Mot de passe</label>
                      <Link href="/forgot-password" className="auth-pass-forgot">
                        Oublié ?
                      </Link>
                    </div>
                    <div className="auth-pass-input-wrap">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="auth-pass-eye"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                      >
                        {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                      </button>
                    </div>
                  </div>
                  <label className="auth-pass-check">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    />
                    <span>Rester connecté</span>
                  </label>
                  <button type="submit" disabled={loading} className="auth-pass-submit">
                    {loading ? "Embarquement…" : "Embarquer"}
                  </button>
                </form>
                )
              ) : (
                <form onSubmit={onSignUp} className="auth-pass-form auth-pass-form-signup">
                  <fieldset className="auth-pass-fieldset auth-pass-civility-row">
                    <legend>Civilité</legend>
                    <div className="auth-pass-civility" role="radiogroup" aria-label="Civilité">
                      {(
                        [
                          { value: "MR", label: "Mr" },
                          { value: "MME", label: "Mme" },
                        ] as const
                      ).map((opt) => (
                        <label key={opt.value} className="auth-pass-radio">
                          <input
                            type="radio"
                            name="civility"
                            value={opt.value}
                            checked={civility === opt.value}
                            onChange={() => setCivility(opt.value)}
                            required
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="auth-pass-grid">
                    <div className="auth-pass-field">
                      <label htmlFor="auth-fullname">Nom complet</label>
                      <input
                        id="auth-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoComplete="name"
                        placeholder="Nom complet"
                      />
                    </div>
                    <div className="auth-pass-field">
                      <label htmlFor="auth-city">Ville</label>
                      <input
                        id="auth-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        autoComplete="address-level2"
                        placeholder="Casablanca"
                      />
                    </div>
                  </div>

                  <div className="auth-pass-grid">
                    <div className="auth-pass-field">
                      <label htmlFor="auth-phone">Téléphone</label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        autoComplete="tel"
                        placeholder="+212 6 XX XX XX XX"
                      />
                    </div>
                    <div className="auth-pass-field">
                      <label htmlFor="auth-education">Niveau d&apos;études</label>
                      <select
                        id="auth-education"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Sélectionner…
                        </option>
                        {EDUCATION_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <fieldset className="auth-pass-fieldset auth-pass-civility-row">
                    <legend>Type du dernier établissement</legend>
                    <div
                      className="auth-pass-civility"
                      role="radiogroup"
                      aria-label="Type du dernier établissement"
                    >
                      {SCHOOL_TYPES.map((type) => (
                        <label key={type} className="auth-pass-radio">
                          <input
                            type="radio"
                            name="lastSchoolType"
                            value={type}
                            checked={lastSchoolType === type}
                            onChange={() => setLastSchoolType(type)}
                            required
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="auth-pass-grid">
                    <div className="auth-pass-field">
                      <label htmlFor="auth-reg-email">Adresse e-mail</label>
                      <input
                        id="auth-reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        spellCheck={false}
                        placeholder="vous@email.com"
                      />
                    </div>
                    <div className="auth-pass-field">
                      <label htmlFor="auth-reg-password">Mot de passe</label>
                      <div className="auth-pass-input-wrap">
                        <input
                          id="auth-reg-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="8 caractères min."
                        />
                        <button
                          type="button"
                          className="auth-pass-eye"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Masquer" : "Afficher"}
                        >
                          {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                        </button>
                      </div>
                      {password.length > 0 && (
                        <div className="auth-pass-strength" aria-live="polite">
                          <div className="auth-pass-strength-bar">
                            {[1, 2, 3].map((step) => (
                              <span
                                key={step}
                                className={strength.level >= step ? "is-active" : ""}
                              />
                            ))}
                          </div>
                          <p>{strength.label}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="auth-pass-legal">
                    <p className="auth-pass-privacy">
                      {iat.brand} collecte vos données personnelles dans le cadre de la gestion des
                      candidatures et de l&apos;accès à la plateforme. Ce traitement de données est
                      soumis à la réglementation applicable en matière de protection des données à
                      caractère personnel. Vous pouvez exercer vos droits d&apos;accès, de
                      rectification et d&apos;opposition conformément aux dispositions de la loi
                      09-08 en contactant le service admissions à l&apos;adresse e-mail :{" "}
                      <a href={iat.emailHref}>{iat.email}</a>.
                    </p>

                    <label className="auth-pass-check">
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        required
                      />
                      <span>
                        J&apos;ai lu et j&apos;accepte les{" "}
                        <Link href="/cgu" target="_blank" rel="noopener noreferrer">
                          Conditions Générales d&apos;Utilisation
                        </Link>
                        , y compris la clause relative à la protection des données personnelles, et
                        j&apos;accepte de rester informé par e-mail des actualités et offres de votre
                        organisation.
                      </span>
                    </label>
                  </div>

                  <button type="submit" disabled={loading} className="auth-pass-submit">
                    {loading ? "Confirmation…" : "Confirmer l'inscription"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <div className="bp-stub">
          <div className="bp-flight-code">{flightCode}</div>
          <div className="bp-gate">
            <span>PORTE</span>
            {gateCode}
          </div>
          <div className="bp-barcode" aria-hidden />
        </div>
        <div className="bp-notch" aria-hidden />
      </section>
    </div>
  );
}
