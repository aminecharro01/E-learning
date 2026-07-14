-- Optional image illustration for a quiz question énoncé
ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS image_asset_id UUID NULL;
