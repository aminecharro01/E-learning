-- Media folders — pure DB organizational concept, no physical storage of their own.
-- Self-referential tree; cascading a folder row is safe because folders hold no bytes.
CREATE TABLE media_folders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    parent_id   UUID REFERENCES media_folders(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_folders_parent_id ON media_folders(parent_id);

-- Nullable: existing assets stay "unfiled" (root) after migration. SET NULL (not CASCADE)
-- so an asset row/physical file is never silently lost if a folder is ever removed
-- outside the app's own recursive-delete flow (see MediaFolderService#deleteFolder).
ALTER TABLE assets ADD COLUMN folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_assets_folder_id ON assets(folder_id);
