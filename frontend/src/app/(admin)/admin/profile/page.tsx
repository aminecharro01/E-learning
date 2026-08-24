"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";
import type { User } from "@/types/domain";
import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setError("Impossible de charger votre profil."));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Mon profil</h1>
        <p className="mt-1 text-sm text-muted">
          Photo, mot de passe et double authentification — sans quitter l&apos;espace administration.
        </p>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {!user && !error && <Skeleton className="h-64 rounded-2xl" />}

      {user && <AccountSettingsPanel user={user} onUserChange={setUser} />}
    </div>
  );
}
