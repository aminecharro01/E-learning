"use client";

import { useState } from "react";
import { FileUpload } from "@/components/admin/FileUpload";

export default function AdminMediaPage() {
  const [lastId, setLastId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Médias</h1>
        <p className="mt-1 text-sm text-muted">
          Envoi des fichiers vers la bibliothèque médias (liens signés à la diffusion)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FileUpload kind="VIDEO" onUploaded={(a) => setLastId(a.id)} />
        <FileUpload kind="PDF" onUploaded={(a) => setLastId(a.id)} />
        <FileUpload kind="IMAGE" onUploaded={(a) => setLastId(a.id)} />
        <FileUpload kind="SLIDE" onUploaded={(a) => setLastId(a.id)} />
      </div>

      {lastId && (
        <p className="alert alert-success">
          Dernier fichier téléversé — identifiant : <code className="font-mono">{lastId}</code>
        </p>
      )}
    </div>
  );
}
