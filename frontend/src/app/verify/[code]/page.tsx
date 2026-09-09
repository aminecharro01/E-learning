import { headers } from "next/headers";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/BrandLogo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type CertificateVerifyResponse = {
  id: string;
  verificationCode: string;
  issuedAt: string;
  formationTitle: string;
  learnerName: string;
  physicallyDelivered: boolean;
  deliveredAt: string | null;
};

async function fetchCertificate(code: string): Promise<CertificateVerifyResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/certificates/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CertificateVerifyResponse;
  } catch {
    return null;
  }
}

async function pageUrl(code: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}/verify/${encodeURIComponent(code)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const cert = await fetchCertificate(code);
  if (!cert) {
    return { title: "Attestation introuvable — IAT Academy" };
  }
  const title = `${cert.learnerName} — Attestation IAT Academy`;
  const description = `${cert.learnerName} a validé le parcours « ${cert.formationTitle} » chez IAT Academy. Code de vérification : ${cert.verificationCode}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [cert, url] = await Promise.all([fetchCertificate(code), pageUrl(code)]);
  const linkedInAddToProfileUrl = cert
    ? `https://www.linkedin.com/profile/add?${new URLSearchParams({
        startTask: "CERTIFICATION_NAME",
        name: cert.formationTitle,
        organizationName: "IAT Academy",
        issueYear: String(new Date(cert.issuedAt).getFullYear()),
        issueMonth: String(new Date(cert.issuedAt).getMonth() + 1),
        certUrl: url,
        certId: cert.verificationCode,
      }).toString()}`
    : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg,#0b1220)] px-4 py-12">
      <div className="card-theme w-full max-w-lg rounded-2xl p-8 text-center">
        <div className="flex justify-center">
          <BrandLogo href={null} size="md" />
        </div>

        {!cert ? (
          <>
            <h1 className="mt-6 text-xl font-semibold text-heading">Code de vérification invalide</h1>
            <p className="mt-2 text-sm text-muted">
              Aucune attestation IAT Academy ne correspond à ce code.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow mt-6 justify-center">Attestation vérifiée</p>
            <h1 className="mt-1 text-2xl font-semibold text-heading">{cert.learnerName}</h1>
            <p className="mt-1 text-sm text-muted">a validé le parcours</p>
            <p className="mt-1 text-lg font-medium text-heading">{cert.formationTitle}</p>
            <p className="mt-4 text-xs text-muted">
              Délivrée le {new Date(cert.issuedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}
              {" · "}Code : {cert.verificationCode}
            </p>

            <a
              href={linkedInAddToProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Ajouter au profil LinkedIn
            </a>
          </>
        )}
      </div>
    </main>
  );
}
