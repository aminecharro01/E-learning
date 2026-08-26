# PDF download-list + mandatory-download gating

## Context

Lesson PDF blocks currently render inline via `PdfViewer.tsx` (an `<iframe>`
onto `/api/assets/{id}/file`). The user wants the **learner** experience
changed to a Coursera-style resource list instead: PDFs are listed with a
download button, never embedded/viewer mode. Downloading the file becomes a
requirement to complete the lesson (like other completion gates already in
the app), and every download is logged for an audit trail.

Three scope decisions were confirmed with the user before this design:

1. **Per-file "required" toggle** (not "all PDFs mandatory") — admin/formateur
   marks each PDF block as required or optional in the lesson editor.
2. **No admin UI for the audit trail yet** — just record it in the database,
   queryable later without a redesign.
3. **Admin-side previews unchanged** — the media library (`FilePreviewModal.tsx`)
   and the lesson editor's own PDF preview (`BlockEditor.tsx`) keep the inline
   iframe (already CSP-fixed in a prior change). Only the learner-facing lesson
   view (`LessonBlocks.tsx`) changes.

## Existing mechanics this plugs into

- `LessonProgress` entity (`videoWatchedPercent`, `completed`, `completedAt`)
  — one row per (user, lesson).
- `ProgressionService.updateLessonProgress(userId, lessonId, videoWatchedPercent)`
  is the **single** method that ever sets `completed = true` — both the
  auto-complete-at-video-threshold path (`LessonBlocks.tsx`'s `onVideoProgress`,
  fire-and-forget, silently swallows errors) and the explicit
  `markLessonCompleted()` wrapper (`updateLessonProgress(userId, lessonId, 100)`,
  called by the "Marquer terminé" / "Terminer et continuer" button) go through
  it. This is the one place the new gate needs to live.
- The lesson page's `onComplete()` (`frontend/src/app/app/learn/[moduleId]/s/[lessonId]/page.tsx`)
  already only calls `goNext()` inside the `try` block after a successful
  await, and shows `err.message` on failure — **no frontend button-logic
  change is needed** for the gate to work; a thrown backend exception is
  already handled correctly.
- Staff (`principal.getRole().isStaff()`) bypass every other content-gating
  check in this codebase (progression, chatbot retrieval, etc.) — the new
  gate follows the same convention.
- `LessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(UUID lessonId)`
  already exists and is what the gate check will use to find a lesson's PDF
  blocks.
- `LessonService.updateBlock()` **replaces** `content` wholesale
  (`block.setContent(request.content())`, no merge) — any frontend code that
  PATCHes a single content field must resend the full content object or it
  will silently drop `assetId`/`title`.
- Latest Flyway migration is `V40__quiz_retry_delay_minutes.sql` → this
  feature's migration is `V41`.

## Data model

**PDF block content** (`lesson_blocks.content`, JSONB, no schema): gains a
`required` boolean key.
- Defaults to `true` when a PDF is uploaded via `BlockEditor.tsx`'s "+ PDF"
  action (matches "obligatoire by default" from the original request).
- Read as `true` if the key is absent (covers PDF blocks created before this
  change — no backfill migration needed since it's schemaless JSON).

**New table `asset_downloads`** (migration `V41__asset_downloads.sql`):

```sql
CREATE TABLE asset_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    lesson_id UUID REFERENCES lessons(id),
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_downloads_user_asset ON asset_downloads(user_id, asset_id);
```

- Append-only log — one row per download click, no uniqueness constraint (a
  re-download after already completing the lesson is still a legitimate,
  loggable event).
- `lesson_id` is nullable and best-effort context (which lesson the download
  happened from); the gating check only needs `(user_id, asset_id)`.
- New entity `AssetDownload` — a plain `@Entity`, **not** extending
  `AuditableEntity` (no `updatedAt`/`updatedBy` needed for an immutable log
  row; just `id`, `user`, `asset`, `lesson` (nullable), `downloadedAt`).
- New repository `AssetDownloadRepository extends JpaRepository<AssetDownload, UUID>`
  with `boolean existsByUserIdAndAssetId(UUID userId, UUID assetId)`.

## Backend

### New endpoint: record + sign

`POST /api/assets/{id}/download` (authenticated, any role — no
`@PreAuthorize`, matches the existing `/stream` endpoint's openness).

Request body: `{ "lessonId": "<uuid, optional>" }`.

Behavior:
1. Save an `AssetDownload` row (`principal.getId()`, `id`, `lessonId` if
   given, `now()`).
2. Delegate to the existing signing logic (`MediaService.createSignedStream`
   / `signStream`) to build the same `SignedStreamResponse` shape `/stream`
   returns, so the frontend's existing URL-resolution code
   (`res.data.url.startsWith("http") ? ... : apiBase + ...`) needs no
   changes.

Kept **separate** from `/stream` deliberately — `/stream` is also called by
`VideoPlayer`, `AssetImage`, and the admin `FilePreviewModal`/`BlockEditor`
previews; piggy-backing the log there would count every inline preview as a
"download".

### Forcing an actual download (not inline open)

`AssetController.file()` currently sets `Content-Disposition: inline` for
`IMAGE`/`VIDEO`/`PDF` kinds unconditionally. The new download flow should
force a real "Save As" (`attachment`), matching the word "télécharger" —
without changing the existing inline behavior used everywhere else (admin
preview, in-lesson image/video rendering).

Approach: the signed URL produced by the new `/download` endpoint carries an
extra query flag (e.g. `&disposition=attachment`) that `AssetController.file()`
honors as an override on top of its existing per-kind `renderInline` switch,
included in the HMAC-signed payload so it can't be tampered with
independently of the signature. The existing `/stream`-issued URLs are
unaffected (no flag → current inline behavior, unchanged).

### The gate itself

`ProgressionService.updateLessonProgress`, right before the existing
`if (!progress.isCompleted() && progress.getVideoWatchedPercent() >= threshold)`
branch flips `completed = true`:

1. Skip the check entirely if the calling user is staff.
2. Load the lesson's blocks (`lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc`),
   filter to `blockType == PDF` where `content.get("required")` is `true` or
   absent.
3. For each such block's `assetId`, check
   `assetDownloadRepository.existsByUserIdAndAssetId(userId, assetId)`.
4. If any required PDF has no matching download row, throw
   `ApiException("Téléchargez d'abord : <titres manquants, séparés par des virgules>.")`
   — surfaces through the existing `handleApi` → 400 → frontend `err.message`
   path with zero new plumbing.

The check is keyed on `(user_id, asset_id)`, not lesson — if the same asset
is reused across two lessons, downloading it once satisfies the requirement
for both. This is deliberate: the requirement is "the learner has obtained
this file," not "clicked download from this specific lesson page."

This applies uniformly whether `updateLessonProgress` was reached via the
auto-video-threshold path (fire-and-forget, exception silently swallowed —
correct: it just won't auto-complete yet) or the explicit "Marquer terminé"
button (exception surfaces as a visible error, `goNext()` skipped).

## Frontend

### Learner lesson view

`LessonBlocks.tsx`: the `block.blockType === "PDF"` branch stops rendering
`<PdfViewer>` and instead renders a new component,
`frontend/src/components/learner/PdfDownloadBlock.tsx`:

- Props: `assetId`, `title`, `required: boolean`, `lessonId`.
- Row layout: file icon, title, an "Obligatoire"/"Optionnel" badge, a
  "Télécharger" button.
- On click: POST `/api/assets/{id}/download` with `{ lessonId }`, then
  navigate the browser to the returned signed URL (real click on a
  short-lived `<a href download>` or `window.location`, not an XHR blob — the
  backend already sets `Content-Disposition: attachment` via the new flag,
  so the browser handles the save dialog).
- After a successful call, flip a local `downloaded` state to show a
  "Téléchargé ✓" indicator for the rest of this page view (client-side only —
  the real gate is enforced server-side at completion time regardless of
  what the UI shows, so this doesn't need to survive a refresh or be
  fetched from the server on load).

No file-size display (would need an extra per-block asset-metadata fetch;
YAGNI — the title is already provided in `block.content.title`).

Multiple PDF blocks in one lesson naturally read as a list this way, in
their existing block order — no new aggregated "resources" section.

### Admin lesson editor

`BlockEditor.tsx`'s PDF block section (~line 206-211) gains a checkbox next
to the existing inline `<PdfViewer>` preview: "Obligatoire (téléchargement
requis pour continuer)", bound to `block.content.required`. Toggling it
calls the existing `PUT /api/lessons/{lessonId}/blocks/{id}` endpoint the
same way `onUpdateText` does — **must send the full spread content**
(`{ ...block.content, required: next }`), not just the changed key, since
`LessonService.updateBlock` replaces `content` wholesale rather than merging.

New PDF uploads (`uploadAndAdd("PDF", file)`) set `required: true` in the
initial content payload.

### Unchanged

`FilePreviewModal.tsx` (admin media library) and `BlockEditor.tsx`'s own PDF
preview keep `<PdfViewer>` as-is.

## Testing

- Backend: extend `ProgressionServiceTest` — blocked when a required PDF is
  undownloaded (both via the explicit-complete path and the video-threshold
  path), allowed once downloaded, optional PDFs never block, staff bypass.
- Backend: a service-level test for the new download-recording endpoint
  (row persisted with correct user/asset/lesson, signed URL shape matches
  `/stream`'s).
- Frontend: `npx tsc --noEmit`, `npx eslint`, `npm run build`.
- Manual (throwaway backend+frontend pair, not the user's own dev servers):
  mark a PDF required, confirm "Marquer terminé" is blocked with the correct
  message before downloading, confirm it succeeds after, confirm an optional
  PDF never blocks, confirm staff bypass, confirm the downloaded file is a
  real "Save As" (attachment) and the admin preview elsewhere is unaffected.

## Out of scope (explicitly, per user's answers)

- No admin page/UI to browse the `asset_downloads` audit trail yet.
- No change to admin-side PDF previews (media library, lesson editor).
- No file-size display in the learner download list.
