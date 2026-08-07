"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bulkUpdateContactMessageStatus,
  deleteContactMessage,
  deleteNewsletterSubscriber,
  listContactMessages,
  listNewsletterSubscribers,
  setNewsletterSubscriberActive,
  updateContactMessageStatus,
  type ContactMessage,
  type NewsletterSubscriber,
} from "@/lib/api";
import { DataTable, type DataTableColumn, type PageMeta } from "@/components/admin/DataTable";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

type Tab = "contact" | "newsletter";

const statusLabel: Record<string, string> = {
  NEW: "Nouveau",
  READ: "Lu",
  ARCHIVED: "Archivé",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminLeadsPage() {
  const [tab, setTab] = useState<Tab>("contact");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [contactRows, setContactRows] = useState<ContactMessage[]>([]);
  const [contactMeta, setContactMeta] = useState<PageMeta | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [contactLoading, setContactLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onBulkStatus(status: "NEW" | "READ" | "ARCHIVED") {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await bulkUpdateContactMessageStatus(Array.from(selectedIds), status);
      setNotice(res.message);
      setSelectedIds(new Set());
      await loadContact(contactMeta?.page ?? 0, contactQuery, contactStatus);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    } finally {
      setBulkBusy(false);
    }
  }

  const [newsRows, setNewsRows] = useState<NewsletterSubscriber[]>([]);
  const [newsMeta, setNewsMeta] = useState<PageMeta | null>(null);
  const [newsSearch, setNewsSearch] = useState("");
  const [newsQuery, setNewsQuery] = useState("");
  const [newsActive, setNewsActive] = useState<"" | "true" | "false">("");
  const [newsLoading, setNewsLoading] = useState(true);

  const loadContact = useCallback(async (p: number, q: string, status: string) => {
    setContactLoading(true);
    setError(null);
    try {
      const data = await listContactMessages(p, 10, q || undefined, status || undefined);
      setContactRows(data.content);
      setContactMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Chargement des messages impossible.");
    } finally {
      setContactLoading(false);
    }
  }, []);

  const loadNews = useCallback(async (p: number, q: string, active: "" | "true" | "false") => {
    setNewsLoading(true);
    setError(null);
    try {
      const activeFilter = active === "" ? undefined : active === "true";
      const data = await listNewsletterSubscribers(p, 10, q || undefined, activeFilter);
      setNewsRows(data.content);
      setNewsMeta({
        page: data.page,
        size: data.size,
        totalElements: data.totalElements,
        totalPages: data.totalPages,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Chargement newsletter impossible.");
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContact(0, "", "");
    void loadNews(0, "", "");
  }, [loadContact, loadNews]);

  useEffect(() => {
    const t = setTimeout(() => {
      setContactQuery(contactSearch.trim());
      void loadContact(0, contactSearch.trim(), contactStatus);
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch, contactStatus, loadContact]);

  useEffect(() => {
    const t = setTimeout(() => {
      setNewsQuery(newsSearch.trim());
      void loadNews(0, newsSearch.trim(), newsActive);
    }, 300);
    return () => clearTimeout(t);
  }, [newsSearch, newsActive, loadNews]);

  async function onStatus(id: string, status: "NEW" | "READ" | "ARCHIVED") {
    setNotice(null);
    try {
      const updated = await updateContactMessageStatus(id, status);
      setContactRows((rows) => rows.map((r) => (r.id === id ? updated : r)));
      setSelected((cur) => (cur?.id === id ? updated : cur));
      setNotice("Statut mis à jour.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    }
  }

  async function onDeleteContact(id: string) {
    if (!window.confirm("Supprimer ce message ?")) return;
    setNotice(null);
    try {
      await deleteContactMessage(id);
      setSelected((cur) => (cur?.id === id ? null : cur));
      await loadContact(contactMeta?.page ?? 0, contactQuery, contactStatus);
      setNotice("Message supprimé.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    }
  }

  async function onToggleNews(id: string, active: boolean) {
    setNotice(null);
    try {
      const updated = await setNewsletterSubscriberActive(id, active);
      setNewsRows((rows) => rows.map((r) => (r.id === id ? updated : r)));
      setNotice(active ? "Abonnement réactivé." : "Abonnement désactivé.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Mise à jour impossible.");
    }
  }

  async function onDeleteNews(id: string) {
    if (!window.confirm("Supprimer cet abonné ?")) return;
    setNotice(null);
    try {
      await deleteNewsletterSubscriber(id);
      await loadNews(newsMeta?.page ?? 0, newsQuery, newsActive);
      setNotice("Abonné supprimé.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
    }
  }

  const contactColumns: DataTableColumn<ContactMessage>[] = [
    {
      key: "select",
      header: "",
      render: (r) => (
        <input
          type="checkbox"
          checked={selectedIds.has(r.id)}
          onChange={() => toggleSelected(r.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Sélectionner le message de ${r.firstName} ${r.lastName}`}
        />
      ),
    },
    {
      key: "name",
      header: "Contact",
      render: (r) => (
        <span>
          <span className="font-medium text-heading">
            {r.firstName} {r.lastName}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{r.email}</span>
        </span>
      ),
    },
    { key: "phone", header: "Téléphone", render: (r) => r.phone },
    {
      key: "status",
      header: "Statut",
      render: (r) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.status === "NEW"
              ? "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] text-[var(--primary)]"
              : r.status === "READ"
                ? "bg-surface-2 text-muted"
                : "bg-surface-2 text-muted opacity-80"
          }`}
        >
          {statusLabel[r.status] ?? r.status}
        </span>
      ),
    },
    {
      key: "date",
      header: "Reçu",
      render: (r) => formatDate(r.createdAt),
    },
  ];

  const newsColumns: DataTableColumn<NewsletterSubscriber>[] = [
    { key: "email", header: "Courriel", render: (r) => r.email },
    {
      key: "active",
      header: "Statut",
      render: (r) => (r.active ? "Actif" : "Désactivé"),
    },
    {
      key: "date",
      header: "Inscrit le",
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={btn.secondaryXs}
            onClick={() => void onToggleNews(r.id, !r.active)}
          >
            {r.active ? "Désactiver" : "Réactiver"}
          </button>
          <button
            type="button"
            className={btn.dangerXs}
            onClick={() => void onDeleteNews(r.id)}
          >
            Supprimer
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Contact & infolettre</h1>
        <p className="mt-1 text-sm text-muted">
          Messages du formulaire d&apos;accueil et abonnés à l&apos;infolettre
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-theme pb-3">
        <button
          type="button"
          className={`tab-pill rounded-lg border border-theme px-3 py-1.5 text-sm ${
            tab === "contact" ? "tab-pill-active" : ""
          }`}
          onClick={() => setTab("contact")}
        >
          Messages contact
          {contactMeta ? ` (${contactMeta.totalElements})` : ""}
        </button>
        <button
          type="button"
          className={`tab-pill rounded-lg border border-theme px-3 py-1.5 text-sm ${
            tab === "newsletter" ? "tab-pill-active" : ""
          }`}
          onClick={() => setTab("newsletter")}
        >
          Infolettre
          {newsMeta ? ` (${newsMeta.totalElements})` : ""}
        </button>
      </div>

      {error && <p className="alert alert-error">{error}</p>}
      {notice && <p className="alert alert-success">{notice}</p>}

      {tab === "contact" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted">
              Filtrer statut{" "}
              <select
                className="select-theme ml-2"
                value={contactStatus}
                onChange={(e) => setContactStatus(e.target.value)}
              >
                <option value="">Tous</option>
                <option value="NEW">Nouveau</option>
                <option value="READ">Lu</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </label>
          </div>
          {selectedIds.size > 0 && (
            <div className="card-theme flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
              <span className="text-sm text-heading">{selectedIds.size} sélectionné(s)</span>
              <button type="button" className={btn.secondaryXs} disabled={bulkBusy} onClick={() => void onBulkStatus("READ")}>
                Marquer lu
              </button>
              <button type="button" className={btn.secondaryXs} disabled={bulkBusy} onClick={() => void onBulkStatus("ARCHIVED")}>
                Archiver
              </button>
              <button type="button" className={btn.neutralXs} onClick={() => setSelectedIds(new Set())}>
                Désélectionner
              </button>
            </div>
          )}
          <DataTable
            columns={contactColumns}
            data={contactRows}
            loading={contactLoading}
            search={contactSearch}
            onSearchChange={setContactSearch}
            searchPlaceholder="Rechercher nom, courriel, message…"
            pageMeta={contactMeta}
            onPageChange={(p) => {
              void loadContact(p, contactQuery, contactStatus);
            }}
            onRowClick={(row) => {
              setSelected(row);
              if (row.status === "NEW") {
                void onStatus(row.id, "READ");
              }
            }}
          />
          {selected && (
            <div className="card-theme rounded-2xl p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-heading">
                    {selected.firstName} {selected.lastName}
                  </h2>
                  <p className="text-sm text-muted">
                    {selected.email} · {selected.phone} · {formatDate(selected.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted underline hover:text-heading"
                  onClick={() => setSelected(null)}
                >
                  Fermer
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-heading">
                {selected.message}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn.secondarySm}
                  onClick={() => void onStatus(selected.id, "READ")}
                >
                  Marquer lu
                </button>
                <button
                  type="button"
                  className={btn.secondarySm}
                  onClick={() => void onStatus(selected.id, "ARCHIVED")}
                >
                  Archiver
                </button>
                <button
                  type="button"
                  className={btn.dangerSm}
                  onClick={() => void onDeleteContact(selected.id)}
                >
                  Supprimer
                </button>
                <a href={`mailto:${selected.email}`} className={btn.primarySm}>
                  Répondre par courriel
                </a>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted">
              Filtrer{" "}
              <select
                className="select-theme ml-2"
                value={newsActive}
                onChange={(e) => setNewsActive(e.target.value as "" | "true" | "false")}
              >
                <option value="">Tous</option>
                <option value="true">Actifs</option>
                <option value="false">Désactivés</option>
              </select>
            </label>
          </div>
          <DataTable
            columns={newsColumns}
            data={newsRows}
            loading={newsLoading}
            search={newsSearch}
            onSearchChange={setNewsSearch}
            searchPlaceholder="Rechercher un courriel…"
            pageMeta={newsMeta}
            onPageChange={(p) => {
              void loadNews(p, newsQuery, newsActive);
            }}
          />
        </>
      )}
    </div>
  );
}
