-- Photo de profil apprenant (modifiable par l'étudiant ; infos identité réservées à l'admin)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
