ALTER TABLE users
    ADD COLUMN IF NOT EXISTS civility VARCHAR(10),
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS country VARCHAR(80),
    ADD COLUMN IF NOT EXISTS city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS education_level VARCHAR(120),
    ADD COLUMN IF NOT EXISTS last_school_type VARCHAR(120),
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET
    first_name = COALESCE(first_name, NULLIF(TRIM(SPLIT_PART(full_name, ' ', 1)), '')),
    last_name = COALESCE(
        last_name,
        NULLIF(TRIM(REGEXP_REPLACE(full_name, '^\S+\s*', '')), '')
    ),
    country = COALESCE(country, 'Maroc')
WHERE full_name IS NOT NULL AND TRIM(full_name) <> '';
