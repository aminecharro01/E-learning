# PDF Download-List + Mandatory-Download Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the learner-facing inline PDF viewer with a Coursera-style download list, gate lesson completion on downloading every PDF marked "required" at least once, and log every download for an audit trail.

**Architecture:** A new `asset_downloads` table records every download (user, asset, lesson, timestamp). A new `POST /api/assets/{id}/download` endpoint writes that record and returns a signed URL (same shape as the existing `/stream` endpoint) with a `disposition=attachment` flag so the browser force-downloads instead of opening inline. `ProgressionService.updateLessonProgress` — the single method that ever marks a lesson `completed` — gains a check that blocks completion until every PDF block flagged `required: true` in its content has a matching download row for that user (staff bypass). The learner lesson view stops rendering `<PdfViewer>` for PDF blocks and renders a download-list row instead; the admin lesson editor gains a per-file "Obligatoire" checkbox. Admin media-library and lesson-editor PDF previews are untouched.

**Tech Stack:** Spring Boot 3.4.5 / Java 21, PostgreSQL + Flyway, JUnit5 + Mockito; Next.js 15 / TypeScript / Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-27-pdf-download-gating-design.md`

## Global Constraints

- Latest Flyway migration is `V40__quiz_retry_delay_minutes.sql` — this feature's migration is `V41`.
- `LessonService.updateBlock()` **replaces** `content` wholesale (no merge) — any PATCH/PUT of a single content field must resend the full spread content object.
- Staff (`Role.isStaff()`) bypass every content-gating check in this codebase — the new gate must follow the same convention.
- Never trust client input for authorization — the `/download` endpoint reads `principal.getId()` from `@AuthenticationPrincipal`, never a client-supplied user id.
- Backend: run `./mvnw -q compile` and `./mvnw -q test` after every task. Frontend: run `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx`, and `npm run build` (then `rm -rf .next`) after every frontend task. Both must be clean before considering the plan done.
- Never add a `Co-Authored-By: Claude` (or any AI) trailer to commits in this repo.
- Manual verification must use a throwaway backend/frontend pair on alternate ports, never the ports the user's own dev servers are running on. Clean up (`taskkill` by PID, delete temp files, `rm -rf .next`, clear any Redis rate-limit keys accumulated from repeated test logins) after verifying.

---

### Task 1: `asset_downloads` table + entity + repository

**Files:**
- Create: `backend/src/main/resources/db/migration/V41__asset_downloads.sql`
- Create: `backend/src/main/java/ma/iatacademy/api/domain/entity/AssetDownload.java`
- Create: `backend/src/main/java/ma/iatacademy/api/repository/AssetDownloadRepository.java`

**Interfaces:**
- Produces: `AssetDownload` entity with `id: UUID`, `user: User`, `asset: Asset`, `lesson: Lesson` (nullable), `downloadedAt: Instant`. `AssetDownloadRepository.existsByUserIdAndAssetId(UUID userId, UUID assetId): boolean` — this is what Task 3's gate check calls.

- [ ] **Step 1: Write the migration**

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

- [ ] **Step 2: Write the entity**

```java
package ma.iatacademy.api.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/** Append-only audit log — one row per download click, no update tracking needed. */
@Entity
@Table(name = "asset_downloads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetDownload {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(name = "downloaded_at", nullable = false)
    private Instant downloadedAt;

    @PrePersist
    protected void onCreate() {
        if (downloadedAt == null) {
            downloadedAt = Instant.now();
        }
    }
}
```

- [ ] **Step 3: Write the repository**

```java
package ma.iatacademy.api.repository;

import ma.iatacademy.api.domain.entity.AssetDownload;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AssetDownloadRepository extends JpaRepository<AssetDownload, UUID> {

    boolean existsByUserIdAndAssetId(UUID userId, UUID assetId);
}
```

- [ ] **Step 4: Compile and run the full backend test suite**

Run: `cd backend && ./mvnw -q compile && ./mvnw -q test`
Expected: compiles clean, all existing tests still pass (this task adds no new tests — Flyway migrating cleanly on the test DB is the verification for the SQL, exercised automatically by any test that boots the Spring context, e.g. `SecurityRbacTest`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V41__asset_downloads.sql backend/src/main/java/ma/iatacademy/api/domain/entity/AssetDownload.java backend/src/main/java/ma/iatacademy/api/repository/AssetDownloadRepository.java
git commit -m "Add asset_downloads audit table for the PDF download gate"
```

---

### Task 2: Download-recording endpoint + forced-attachment disposition

**Files:**
- Create: `backend/src/main/java/ma/iatacademy/api/dto/media/DownloadAssetRequest.java`
- Modify: `backend/src/main/java/ma/iatacademy/api/service/MediaService.java`
- Modify: `backend/src/main/java/ma/iatacademy/api/controller/AssetController.java`
- Test: `backend/src/test/java/ma/iatacademy/api/service/MediaServiceTest.java` (new file)

**Interfaces:**
- Consumes: `AssetDownloadRepository.save(AssetDownload)` (from Task 1, standard `JpaRepository` method — no new method needed there).
- Produces: `MediaService.recordDownloadAndSign(UUID assetId, UserPrincipal requester, UUID lessonId): SignedStreamResponse` — Task 5's frontend calls this via the new controller endpoint `POST /api/assets/{id}/download`.

- [ ] **Step 1: Write the DTO**

```java
package ma.iatacademy.api.dto.media;

import java.util.UUID;

public record DownloadAssetRequest(UUID lessonId) {
}
```

- [ ] **Step 2: Write the failing test**

Create `backend/src/test/java/ma/iatacademy/api/service/MediaServiceTest.java`:

```java
package ma.iatacademy.api.service;

import ma.iatacademy.api.config.BunnyStreamProperties;
import ma.iatacademy.api.config.JwtProperties;
import ma.iatacademy.api.config.MediaProperties;
import ma.iatacademy.api.domain.entity.Asset;
import ma.iatacademy.api.domain.entity.AssetDownload;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.domain.entity.User;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.dto.media.SignedStreamResponse;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.AssetRepository;
import ma.iatacademy.api.repository.LessonRepository;
import ma.iatacademy.api.repository.MediaFolderRepository;
import ma.iatacademy.api.repository.UserRepository;
import ma.iatacademy.api.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MediaServiceTest {

    @Mock private AssetRepository assetRepository;
    @Mock private MediaFolderRepository mediaFolderRepository;
    @Mock private MediaProperties mediaProperties;
    @Mock private JwtProperties jwtProperties;
    @Mock private BunnyStreamProperties bunnyStreamProperties;
    @Mock private BunnyStreamClient bunnyStreamClient;
    @Mock private AssetDownloadRepository assetDownloadRepository;
    @Mock private UserRepository userRepository;
    @Mock private LessonRepository lessonRepository;

    private MediaService mediaService;

    @BeforeEach
    void setUp() {
        mediaService = new MediaService(assetRepository, mediaFolderRepository, mediaProperties,
                jwtProperties, bunnyStreamProperties, bunnyStreamClient, assetDownloadRepository,
                userRepository, lessonRepository);
        when(mediaProperties.getSigningSecret()).thenReturn("test-signing-secret-of-sufficient-length");
        when(mediaProperties.getSignedUrlTtlSeconds()).thenReturn(3600L);
    }

    @Test
    void recordDownloadAndSignSavesLogRowAndReturnsAttachmentUrl() {
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        Asset asset = Asset.builder().id(assetId).storagePath("/tmp/x.pdf").assetKind("PDF").build();
        User user = User.builder().id(userId).role(Role.ETUDIANT).build();
        Lesson lesson = Lesson.builder().id(lessonId).build();
        UserPrincipal principal = new UserPrincipal(user);

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(lessonRepository.getReferenceById(lessonId)).thenReturn(lesson);

        SignedStreamResponse response = mediaService.recordDownloadAndSign(assetId, principal, lessonId);

        assertTrue(response.url().contains("disposition=attachment"));
        assertTrue(response.url().contains("/api/assets/" + assetId + "/file"));

        ArgumentCaptor<AssetDownload> captor = ArgumentCaptor.forClass(AssetDownload.class);
        verify(assetDownloadRepository).save(captor.capture());
        assertEquals(assetId, captor.getValue().getAsset().getId());
        assertEquals(userId, captor.getValue().getUser().getId());
        assertEquals(lessonId, captor.getValue().getLesson().getId());
    }

    @Test
    void recordDownloadAndSignAllowsNullLessonId() {
        UUID assetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Asset asset = Asset.builder().id(assetId).storagePath("/tmp/x.pdf").assetKind("PDF").build();
        User user = User.builder().id(userId).role(Role.ETUDIANT).build();
        UserPrincipal principal = new UserPrincipal(user);

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.getReferenceById(userId)).thenReturn(user);

        mediaService.recordDownloadAndSign(assetId, principal, null);

        ArgumentCaptor<AssetDownload> captor = ArgumentCaptor.forClass(AssetDownload.class);
        verify(assetDownloadRepository).save(captor.capture());
        assertEquals(null, captor.getValue().getLesson());
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && ./mvnw -q test -Dtest=MediaServiceTest`
Expected: FAIL — `MediaService` has no such constructor (missing `assetDownloadRepository`/`userRepository`/`lessonRepository` params) and no `recordDownloadAndSign` method.

- [ ] **Step 4: Add the new dependencies and method to `MediaService`**

In `backend/src/main/java/ma/iatacademy/api/service/MediaService.java`:

Add these fields right after the existing `bunnyStreamClient` field (line 93):

```java
    private final AssetDownloadRepository assetDownloadRepository;
    private final ma.iatacademy.api.repository.UserRepository userRepository;
    private final ma.iatacademy.api.repository.LessonRepository lessonRepository;
```

Add these imports near the top:

```java
import ma.iatacademy.api.domain.entity.AssetDownload;
import ma.iatacademy.api.domain.entity.Lesson;
import ma.iatacademy.api.repository.AssetDownloadRepository;
```

Change the existing `private SignedStreamResponse signStream(Asset asset)` method (line 237) to take a boolean, and update its two call sites:

```java
    private SignedStreamResponse signStream(Asset asset, boolean forceDownload) {
        long expires = System.currentTimeMillis() / 1000L + mediaProperties.getSignedUrlTtlSeconds();
        if (asset.getStoragePath().startsWith(BUNNY_STORAGE_PREFIX)) {
            String guid = asset.getStoragePath().substring(BUNNY_STORAGE_PREFIX.length());
            return new SignedStreamResponse(bunnyStreamClient.embedUrl(guid), expires);
        }
        String sig = sign(asset.getId(), expires);
        String url = "/api/assets/" + asset.getId() + "/file?expires=" + expires + "&sig=" + sig
                + (forceDownload ? "&disposition=attachment" : "");
        return new SignedStreamResponse(url, expires);
    }
```

Update `createSignedStream` (line 217-222) and `createSignedStreamTrusted` (line 230-235) to call `signStream(asset, false)` instead of `signStream(asset)`.

Add the new public method right after `createSignedStreamTrusted`:

```java
    /**
     * Records a download-audit row before signing so the ProgressionService gate
     * (asset_downloads existsByUserIdAndAssetId) sees it immediately. Separate from
     * createSignedStream on purpose: /stream is also called by VideoPlayer, AssetImage,
     * and admin previews - piggy-backing here would log every inline preview as a
     * "download".
     */
    @Transactional
    public SignedStreamResponse recordDownloadAndSign(UUID assetId, UserPrincipal requester, UUID lessonId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new NotFoundException("Média introuvable."));
        assertReadable(asset, requester);
        AssetDownload.AssetDownloadBuilder download = AssetDownload.builder()
                .user(userRepository.getReferenceById(requester.getId()))
                .asset(asset);
        if (lessonId != null) {
            download.lesson(lessonRepository.getReferenceById(lessonId));
        }
        assetDownloadRepository.save(download.build());
        return signStream(asset, true);
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && ./mvnw -q test -Dtest=MediaServiceTest`
Expected: PASS

- [ ] **Step 6: Wire the new endpoint into `AssetController`**

In `backend/src/main/java/ma/iatacademy/api/controller/AssetController.java`, add the import:

```java
import ma.iatacademy.api.dto.media.DownloadAssetRequest;
```

Add the new endpoint right after the existing `stream()` method:

```java
    @PostMapping("/{id}/download")
    public ResponseEntity<SignedStreamResponse> download(
            @PathVariable UUID id,
            @RequestBody(required = false) DownloadAssetRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID lessonId = request != null ? request.lessonId() : null;
        return ResponseEntity.ok(mediaService.recordDownloadAndSign(id, principal, lessonId));
    }
```

Change the existing `file()` method to accept and honor an optional disposition override. The
method already declares a local variable named `disposition` a few lines down (the built
`Content-Disposition` header value) — name the new request param `dispositionParam` to avoid
shadowing it. Replace:

```java
    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(
            @PathVariable UUID id,
            @RequestParam long expires,
            @RequestParam String sig
    ) {
        Resource resource = mediaService.loadSignedFile(id, expires, sig);
        Asset asset = mediaService.getAsset(id);
        boolean renderInline = switch (asset.getAssetKind()) {
            case "IMAGE", "VIDEO", "PDF" -> true;
            default -> false;
        };
        String disposition = (renderInline ? "inline" : "attachment") + "; filename=\"" + sanitizeFilename(asset.getFilename()) + "\"";
```

with:

```java
    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(
            @PathVariable UUID id,
            @RequestParam long expires,
            @RequestParam String sig,
            @RequestParam(value = "disposition", required = false) String dispositionParam
    ) {
        Resource resource = mediaService.loadSignedFile(id, expires, sig);
        Asset asset = mediaService.getAsset(id);
        boolean renderInline = !"attachment".equals(dispositionParam) && switch (asset.getAssetKind()) {
            case "IMAGE", "VIDEO", "PDF" -> true;
            default -> false;
        };
        String disposition = (renderInline ? "inline" : "attachment") + "; filename=\"" + sanitizeFilename(asset.getFilename()) + "\"";
```

The rest of the method (building/returning the response using the local `disposition` variable) is unchanged.

- [ ] **Step 7: Compile and run the full backend test suite**

Run: `cd backend && ./mvnw -q compile && ./mvnw -q test`
Expected: clean compile, all tests (including the two new `MediaServiceTest` cases) pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/ma/iatacademy/api/dto/media/DownloadAssetRequest.java backend/src/main/java/ma/iatacademy/api/service/MediaService.java backend/src/main/java/ma/iatacademy/api/controller/AssetController.java backend/src/test/java/ma/iatacademy/api/service/MediaServiceTest.java
git commit -m "Add POST /api/assets/{id}/download - logs the download, forces attachment"
```

---

### Task 3: Gate lesson completion on required-PDF downloads

**Files:**
- Modify: `backend/src/main/java/ma/iatacademy/api/service/ProgressionService.java`
- Test: `backend/src/test/java/ma/iatacademy/api/service/ProgressionServiceTest.java`

**Interfaces:**
- Consumes: `AssetDownloadRepository.existsByUserIdAndAssetId` (Task 1), `LessonBlockRepository.findByLessonIdOrderByOrderIndexAsc` (already exists).
- Produces: `ProgressionService.updateLessonProgress` now throws `ApiException` when a required PDF hasn't been downloaded — no signature change, so `ProgressController` needs no changes.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/test/java/ma/iatacademy/api/service/ProgressionServiceTest.java`:

Add these imports:

```java
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.domain.enums.Role;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertThrows;
```

Add these mocks to the class:

```java
    @Mock
    private LessonBlockRepository lessonBlockRepository;
    @Mock
    private AssetDownloadRepository assetDownloadRepository;
```

Update `setUp()`'s constructor call to append the two new mocks in field-declaration order:

```java
        progressionService = new ProgressionService(moduleRepository, lessonRepository, lessonProgressRepository,
                quizRepository, quizAttemptRepository, userRepository, quizProperties, appSettingsService,
                ufValidationService, notificationService, badgeService, assignmentRepository,
                lessonBlockRepository, assetDownloadRepository);
```

Add these test methods:

```java
    @Test
    void completingLessonBlockedWhenRequiredPdfNotDownloaded() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Fiche technique", "required", true))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(java.util.Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));
        when(assetDownloadRepository.existsByUserIdAndAssetId(userId, assetId)).thenReturn(false);

        assertThrows(ApiException.class,
                () -> progressionService.updateLessonProgress(userId, lessonId, 100));
    }

    @Test
    void completingLessonSucceedsWhenRequiredPdfDownloaded() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Fiche technique", "required", true))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(java.util.Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));
        when(assetDownloadRepository.existsByUserIdAndAssetId(userId, assetId)).thenReturn(true);

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }

    @Test
    void completingLessonIgnoresOptionalPdf() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Annexe", "required", false))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(java.util.Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.ETUDIANT).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }

    @Test
    void completingLessonBypassesGateForStaff() {
        UUID userId = UUID.randomUUID();
        UUID lessonId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();
        ModuleEntity module = ModuleEntity.builder().id(UUID.randomUUID()).build();
        Lesson lesson = Lesson.builder().id(lessonId).module(module).build();
        LessonBlock pdfBlock = LessonBlock.builder().id(UUID.randomUUID()).blockType(BlockType.PDF)
                .content(Map.of("assetId", assetId.toString(), "title", "Fiche technique", "required", true))
                .build();

        when(lessonRepository.findById(lessonId)).thenReturn(java.util.Optional.of(lesson));
        when(lessonProgressRepository.findByUserIdAndLessonId(userId, lessonId)).thenReturn(Optional.empty());
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(module.getId())).thenReturn(List.of(lesson));
        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).role(Role.FORMATEUR).build()));
        when(lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)).thenReturn(List.of(pdfBlock));

        LessonProgressResponse response = progressionService.updateLessonProgress(userId, lessonId, 100);

        assertTrue(response.completed());
    }
```

Add `lenient()` guards are not needed here since every stub set is consumed by the code path under test (all four tests reach the gate check).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && ./mvnw -q test -Dtest=ProgressionServiceTest`
Expected: FAIL to compile — constructor arg count mismatch (`lessonBlockRepository`/`assetDownloadRepository` not yet fields on `ProgressionService`).

- [ ] **Step 3: Implement the gate in `ProgressionService`**

Add these imports:

```java
import ma.iatacademy.api.domain.entity.LessonBlock;
import ma.iatacademy.api.domain.enums.BlockType;
import ma.iatacademy.api.exception.ApiException;
import ma.iatacademy.api.repository.AssetDownloadRepository;
import ma.iatacademy.api.repository.LessonBlockRepository;
```

Add two fields at the end of the existing field list (after `assignmentRepository`):

```java
    private final LessonBlockRepository lessonBlockRepository;
    private final AssetDownloadRepository assetDownloadRepository;
```

Change `updateLessonProgress`'s completion branch from:

```java
        if (!progress.isCompleted()
                && progress.getVideoWatchedPercent() >= quizProperties.getSectionCompletionVideoPercent()) {
            progress.setCompleted(true);
            progress.setCompletedAt(Instant.now());
        }
```

to:

```java
        if (!progress.isCompleted()
                && progress.getVideoWatchedPercent() >= quizProperties.getSectionCompletionVideoPercent()) {
            assertRequiredDownloadsComplete(userId, lesson);
            progress.setCompleted(true);
            progress.setCompletedAt(Instant.now());
        }
```

Add the new private method anywhere below `updateLessonProgress`:

```java
    /**
     * A lesson can't complete until every PDF block flagged required:true (default
     * when the key is absent) has a matching asset_downloads row for this user - see
     * MediaService#recordDownloadAndSign, the only place that writes one. Keyed on
     * (user, asset), not lesson: the same asset reused across two lessons only needs
     * downloading once.
     */
    private void assertRequiredDownloadsComplete(UUID userId, Lesson lesson) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable."));
        if (user.getRole().isStaff()) {
            return;
        }
        List<String> missing = lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId()).stream()
                .filter(block -> block.getBlockType() == BlockType.PDF)
                .filter(block -> !Boolean.FALSE.equals(block.getContent().get("required")))
                .filter(block -> {
                    Object assetId = block.getContent().get("assetId");
                    return assetId != null
                            && !assetDownloadRepository.existsByUserIdAndAssetId(userId, UUID.fromString(String.valueOf(assetId)));
                })
                .map(block -> String.valueOf(block.getContent().getOrDefault("title", "Document PDF")))
                .toList();
        if (!missing.isEmpty()) {
            throw new ApiException("Téléchargez d'abord : " + String.join(", ", missing) + ".");
        }
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && ./mvnw -q test -Dtest=ProgressionServiceTest`
Expected: PASS — all four new tests plus every pre-existing test in this class.

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && ./mvnw -q compile && ./mvnw -q test`
Expected: clean compile, all tests pass (this confirms nothing else calling `updateLessonProgress`/`markLessonCompleted` broke — e.g. `AdminService`, `EarlyWarningService` if they touch `LessonProgress`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/ma/iatacademy/api/service/ProgressionService.java backend/src/test/java/ma/iatacademy/api/service/ProgressionServiceTest.java
git commit -m "Block lesson completion until required PDFs are downloaded"
```

---

### Task 4: Admin "Obligatoire" checkbox on PDF blocks

**Files:**
- Modify: `frontend/src/components/admin/BlockEditor.tsx`

**Interfaces:**
- Consumes: existing `PUT /api/lessons/{lessonId}/blocks/{id}` endpoint (body: `{ content: {...} }`, replaces content wholesale — must resend the full object).
- Produces: PDF blocks' `content.required` field, read by Task 5's learner component and Task 3's backend gate.

- [ ] **Step 1: Add the toggle handler**

In `frontend/src/components/admin/BlockEditor.tsx`, add this function next to `onUpdateText` (after its closing brace, around line 325):

```tsx
  async function onToggleRequired(id: string, required: boolean) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    try {
      await apiClient.put(`/api/lessons/${lessonId}/blocks/${id}`, {
        content: { ...block.content, required },
      });
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content: { ...b.content, required } } : b))
      );
    } catch {
      setMessage("Échec de mise à jour.");
    }
  }
```

- [ ] **Step 2: Pass the handler down to `SortableBlock`**

Replace the `SortableBlock` function signature (lines 157-165):

```tsx
function SortableBlock({
  block,
  onUpdateText,
  onDelete,
}: {
  block: BlockItem;
  onUpdateText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
```

with:

```tsx
function SortableBlock({
  block,
  onUpdateText,
  onToggleRequired,
  onDelete,
}: {
  block: BlockItem;
  onUpdateText: (id: string, text: string) => void;
  onToggleRequired: (id: string, required: boolean) => void;
  onDelete: (id: string) => void;
}) {
```

- [ ] **Step 3: Render the checkbox next to the PDF preview**

Replace the PDF block's rendering (around line 206-211):

```tsx
      {block.blockType === "PDF" &&
        (block.content.assetId ? (
          <PdfViewer assetId={String(block.content.assetId)} title={String(block.content.title ?? "")} />
        ) : (
          <p className="text-sm text-muted">Aucun document.</p>
        ))}
```

with:

```tsx
      {block.blockType === "PDF" &&
        (block.content.assetId ? (
          <div className="space-y-2">
            <PdfViewer assetId={String(block.content.assetId)} title={String(block.content.title ?? "")} />
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                checked={block.content.required !== false}
                onChange={(e) => void onToggleRequired(block.id, e.target.checked)}
              />
              Obligatoire (téléchargement requis pour continuer)
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun document.</p>
        ))}
```

- [ ] **Step 4: Wire the prop through where `SortableBlock` is rendered**

Replace (lines 396-401):

```tsx
              <SortableBlock
                key={block.id}
                block={block}
                onUpdateText={onUpdateText}
                onDelete={onDelete}
              />
```

with:

```tsx
              <SortableBlock
                key={block.id}
                block={block}
                onUpdateText={onUpdateText}
                onToggleRequired={onToggleRequired}
                onDelete={onDelete}
              />
```

- [ ] **Step 5: Default new PDF uploads to `required: true`**

`uploadAndAdd` (lines 288-312) builds one shared `content` object for VIDEO/PDF/IMAGE alike
(`{ assetId, title, alt }`) — only PDF should get a `required` key. Replace the block-creation
call (lines 297-305):

```tsx
      const { data: block } = await apiClient.post<BlockItem>(`/api/lessons/${lessonId}/blocks`, {
        blockType: kind,
        content: {
          assetId: asset.id,
          title: file.name,
          alt: file.name,
        },
        orderIndex: blocks.length,
      });
```

with:

```tsx
      const { data: block } = await apiClient.post<BlockItem>(`/api/lessons/${lessonId}/blocks`, {
        blockType: kind,
        content: {
          assetId: asset.id,
          title: file.name,
          alt: file.name,
          ...(kind === "PDF" ? { required: true } : {}),
        },
        orderIndex: blocks.length,
      });
```

- [ ] **Step 6: Type-check, lint, build**

Run: `cd frontend && npx tsc --noEmit && npx eslint . --ext .ts,.tsx && npm run build`
Expected: clean. Then `rm -rf frontend/.next`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/admin/BlockEditor.tsx
git commit -m "Add Obligatoire checkbox to PDF blocks in the lesson editor"
```

---

### Task 5: Learner-facing PDF download list

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/learner/PdfDownloadBlock.tsx`
- Modify: `frontend/src/components/learner/LessonBlocks.tsx`

**Interfaces:**
- Consumes: `POST /api/assets/{id}/download` (Task 2).
- Produces: `downloadAsset(assetId: string, lessonId?: string): Promise<{ url: string }>` in `api.ts`, used only by `PdfDownloadBlock.tsx`.

- [ ] **Step 1: Add the API function**

In `frontend/src/lib/api.ts`, add near `markLessonComplete`:

```ts
export async function downloadAsset(assetId: string, lessonId?: string) {
  const { data } = await apiClient.post<{ url: string; expiresAtEpochSeconds: number }>(
    `/api/assets/${assetId}/download`,
    lessonId ? { lessonId } : {}
  );
  return data;
}
```

(`api.ts` imports the shared client as `apiClient` and re-exports it as `api` for *other* files to
consume — e.g. `LessonBlocks.tsx` imports `{ api }`. Inside `api.ts` itself, every existing function
calls `apiClient` directly, as above.)

- [ ] **Step 2: Write `PdfDownloadBlock.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FileText, Download, Check } from "lucide-react";
import { downloadAsset } from "@/lib/api";
import { ApiClientError } from "@/lib/api-client";
import { btn } from "@/lib/ui";

type Props = {
  assetId: string;
  title: string;
  required: boolean;
  lessonId: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function PdfDownloadBlock({ assetId, title, required, lessonId }: Props) {
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await downloadAsset(assetId, lessonId);
      const absoluteUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
      const link = document.createElement("a");
      link.href = absoluteUrl;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Téléchargement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-theme bg-surface-2 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText size={20} className="shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-heading">{title}</p>
          <span
            className={`text-xs ${required ? "text-[var(--danger)]" : "text-muted"}`}
          >
            {required ? "Obligatoire" : "Optionnel"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {downloaded && <Check size={16} className="text-[var(--success)]" aria-hidden />}
        <button type="button" disabled={busy} onClick={() => void onDownload()} className={btn.secondarySm}>
          <Download size={16} aria-hidden />
          {busy ? "…" : "Télécharger"}
        </button>
      </div>
      {error && <p className="alert alert-error w-full text-xs">{error}</p>}
    </div>
  );
}
```

(`btn.secondarySm` and the `--danger`/`--success` CSS custom properties already exist —
confirmed in `lib/ui.ts` and `globals.css` — reuse them as-is, don't invent new tokens.)

- [ ] **Step 3: Wire it into `LessonBlocks.tsx`**

Replace:

```tsx
          {block.blockType === "PDF" && (
            <PdfViewer
              assetId={block.content.assetId ? String(block.content.assetId) : undefined}
              title={String(block.content.title ?? "Document PDF")}
            />
          )}
```

with:

```tsx
          {block.blockType === "PDF" && block.content.assetId && (
            <PdfDownloadBlock
              assetId={String(block.content.assetId)}
              title={String(block.content.title ?? "Document PDF")}
              required={block.content.required !== false}
              lessonId={lessonId}
            />
          )}
```

Update the import at the top of the file — replace:

```tsx
import { PdfViewer } from "@/components/PdfViewer";
```

with:

```tsx
import { PdfDownloadBlock } from "@/components/learner/PdfDownloadBlock";
```

- [ ] **Step 4: Type-check, lint, build**

Run: `cd frontend && npx tsc --noEmit && npx eslint . --ext .ts,.tsx && npm run build`
Expected: clean. Then `rm -rf frontend/.next`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/components/learner/PdfDownloadBlock.tsx frontend/src/components/learner/LessonBlocks.tsx
git commit -m "Replace inline PDF viewer with a download list in the learner lesson view"
```

---

### Task 6: Live end-to-end verification

**Files:** none (verification only — no code changes).

- [ ] **Step 1: Start a throwaway backend + frontend pair**

Use alternate ports (e.g. 8094/3003), matching `CORS_ORIGINS` to the frontend port and `NEXT_PUBLIC_API_URL` to the backend port, exactly like the verification passes done earlier in this session. Never touch the user's own dev servers' ports.

- [ ] **Step 2: Verify the admin side**

Log in as `admin@iat-academy.local` / `Admin@123`, open a lesson with a PDF block in the editor, confirm the "Obligatoire" checkbox appears and toggles/persists across a page reload.

- [ ] **Step 3: Verify the learner-blocked path**

Log in as a demo learner account whose progression puts them at a lesson containing a required PDF block (or add one via the admin editor to a lesson the learner can currently reach). Confirm:
- The PDF renders as a download row, not an iframe.
- Clicking "Marquer terminé" / "Terminer et continuer" without downloading shows the `ApiException` message and does not advance.

- [ ] **Step 4: Verify the learner-unblocked path**

Click "Télécharger" (confirm a real file download / Save-As happens, not an inline open), then click "Marquer terminé" again — confirm it now succeeds and advances.

- [ ] **Step 5: Verify the optional-PDF and staff-bypass paths**

Toggle a PDF to optional and confirm a different lesson with only that file completes without downloading it. Log in as staff and confirm a lesson with an undownloaded required PDF still completes for them.

- [ ] **Step 6: Verify the audit row**

Query the database directly (`docker exec iat-postgres psql -U iat -d iat_academy -c "SELECT * FROM asset_downloads ORDER BY downloaded_at DESC LIMIT 5;"`) and confirm a row was written with the correct `user_id`/`asset_id`/`lesson_id`.

- [ ] **Step 7: Clean up**

Kill the throwaway backend/frontend by PID, delete any manually-inserted test rows/asset_downloads rows created purely for this verification, clear any accumulated Redis login rate-limit keys, delete any temp scripts/screenshots, `rm -rf frontend/.next`.

- [ ] **Step 8: Update the knowledge graph and push**

```bash
graphify update .
git push origin master
```
