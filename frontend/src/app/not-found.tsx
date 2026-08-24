import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { btn } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <BrandLogo href={null} size="lg" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gold-600)]">Erreur 404</p>
        <h1 className="mt-2 text-2xl font-bold text-heading sm:text-3xl">Cette page n&apos;existe pas</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Le lien est peut-être obsolète, ou la page a été déplacée. Vérifiez l&apos;adresse ou revenez à l&apos;accueil.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={btn.primary}>
          Retour à l&apos;accueil
        </Link>
        <Link href="/app" className={btn.secondary}>
          Mon espace apprenant
        </Link>
      </div>
    </main>
  );
}
