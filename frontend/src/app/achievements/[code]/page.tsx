import { headers } from "next/headers";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/BrandLogo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type PublicBadgeResponse = {
  shareCode: string;
  badgeCode: string;
  label: string;
  description: string;
  icon: string;
  learnerName: string;
  awardedAt: string;
};

async function fetchBadge(code: string): Promise<PublicBadgeResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/badges/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicBadgeResponse;
  } catch {
    return null;
  }
}

async function pageUrl(code: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}/achievements/${encodeURIComponent(code)}`;
}

/** Texte de partage prêt à copier — LinkedIn ne permet pas de pré-remplir le texte d'un
 * post (seulement l'URL), donc on le propose séparément plutôt que de le perdre. */
function suggestedCaption(badge: PublicBadgeResponse): string {
  switch (badge.badgeCode) {
    case "STAGE_VALIDATED":
      return "🧳 Stage validé ! Merci à toute l'équipe pédagogique d'IAT Academy pour l'accompagnement. #IATAcademy #Stage #DéveloppementDigital";
    case "YEAR1_VALIDATED":
      return "📘 Année 1 terminée chez IAT Academy — cap sur l'année 2 ! #IATAcademy #FormationTech #SystèmesDInformation";
    case "YEAR2_VALIDATED":
      return "🎓 Année 2 terminée chez IAT Academy — le diplôme approche ! #IATAcademy #DéveloppementDigital #SystèmesDInformation";
    case "FIRST_MODULE":
      return "🎓 Première étape franchie chez IAT Academy — mon premier module validé ! #IATAcademy #FormationTech #DéveloppementDigital";
    default:
      return `🏆 Nouveau badge débloqué chez IAT Academy : ${badge.label} ! #IATAcademy #DéveloppementDigital`;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const badge = await fetchBadge(code);
  if (!badge) {
    return { title: "Badge introuvable — IAT Academy" };
  }
  const title = `${badge.learnerName} — ${badge.label} · IAT Academy`;
  const description = `${badge.learnerName} a obtenu le badge « ${badge.label} » chez IAT Academy. ${badge.description}`;
  const imageUrl = `${API_URL}/api/badges/verify/${encodeURIComponent(code)}/image.png`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
  };
}

export default async function AchievementPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [badge, url] = await Promise.all([fetchBadge(code), pageUrl(code)]);

  if (!badge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
        <div className="card-theme w-full max-w-lg rounded-2xl p-8 text-center">
          <div className="flex justify-center">
            <BrandLogo href={null} size="md" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-heading">Code de badge invalide</h1>
          <p className="mt-2 text-sm text-muted">Aucune réussite IAT Academy ne correspond à ce code.</p>
        </div>
      </main>
    );
  }

  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const imageUrl = `${API_URL}/api/badges/verify/${encodeURIComponent(code)}/image.png`;
  const dateLabel = new Date(badge.awardedAt).toLocaleDateString("fr-FR", { dateStyle: "long" });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo href={null} size="md" />
        </div>

        <div className="iat-board">
          <div className="boarding-pass">
            <div className="bp-notch" />
            <div className="bp-main">
              <p className="bp-eyebrow">Réussite vérifiée</p>
              <h1 className="bp-title">
                {badge.label} — <span className="grad">{badge.learnerName}</span>
              </h1>
              <p className="bp-sub">{badge.description}</p>
              <dl className="bp-meta">
                <div>
                  <dt>Date</dt>
                  <dd>{dateLabel}</dd>
                </div>
                <div>
                  <dt>Code</dt>
                  <dd className="font-mono text-[13px]">{badge.shareCode}</dd>
                </div>
                <div>
                  <dt>Académie</dt>
                  <dd>IAT Academy</dd>
                </div>
              </dl>
              <div className="bp-actions">
                <a
                  href={linkedInShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Partager sur LinkedIn
                </a>
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Voir l&apos;image
                </a>
              </div>
            </div>
            <div className="bp-stub">
              <span className="text-4xl" aria-hidden>
                {badge.icon}
              </span>
              <span className="bp-flight-code">{badge.badgeCode.replace(/_/g, " ")}</span>
              <div className="bp-barcode" />
            </div>
          </div>
        </div>

        <div className="card-theme mt-4 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Texte suggéré — à copier avant de partager
          </p>
          <p className="mt-2 text-sm text-body">{suggestedCaption(badge)}</p>
        </div>
      </div>
    </main>
  );
}
