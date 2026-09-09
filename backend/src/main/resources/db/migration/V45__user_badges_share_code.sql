-- Code public court par badge obtenu, sur le même modèle que Certificate.verification_code,
-- pour une page de partage publique (/achievements/{code}) et un aperçu LinkedIn (og:image).
ALTER TABLE user_badges ADD COLUMN share_code VARCHAR(20);

UPDATE user_badges
SET share_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 16))
WHERE share_code IS NULL;

ALTER TABLE user_badges ALTER COLUMN share_code SET NOT NULL;
ALTER TABLE user_badges ADD CONSTRAINT uq_user_badges_share_code UNIQUE (share_code);
