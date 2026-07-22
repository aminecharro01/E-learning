-- Accès année 2 reporté à la rentrée suivante (décision client)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS year2_access_enabled BOOLEAN NOT NULL DEFAULT FALSE;
