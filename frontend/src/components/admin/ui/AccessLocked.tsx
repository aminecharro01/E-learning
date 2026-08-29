import { Lock } from "lucide-react";

/** Écran "accès refusé" partagé par toutes les pages admin restreintes à un rôle —
 *  un seul rendu pour ne plus avoir un texte flottant sur certaines pages et une UI
 *  complète qui tente de charger avant d'échouer sur d'autres. */
export function AccessLocked({ reason }: { reason: string }) {
  return (
    <div className="card-theme flex items-start gap-3 rounded-xl p-5">
      <Lock size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />
      <div>
        <p className="font-medium text-heading">Accès restreint</p>
        <p className="mt-1 text-sm text-muted">{reason}</p>
      </div>
    </div>
  );
}
