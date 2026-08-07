-- Assets uploaded as private personal documents (stage documents, avatars) get an
-- owner. Assets left NULL (lesson media authored by admin/formateur) stay shared /
-- readable by any authenticated user, matching existing behavior.
ALTER TABLE assets ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_assets_owner_id ON assets(owner_id);
