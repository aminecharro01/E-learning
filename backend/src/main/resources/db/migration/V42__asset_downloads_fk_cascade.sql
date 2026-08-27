-- V41 left both FKs as the default RESTRICT, which made MediaService#deleteAsset
-- throw a raw 500 (unhandled DataIntegrityViolationException) the moment an asset
-- had ever been downloaded, since deleteAsset() has no special handling for this
-- table. asset_id: CASCADE - once the file is gone the download log for it is
-- meaningless. lesson_id: SET NULL - a lesson getting deleted/restructured later
-- shouldn't destroy the who/what/when record, only its lesson context (already
-- documented as best-effort/nullable in the design spec).
ALTER TABLE asset_downloads DROP CONSTRAINT asset_downloads_asset_id_fkey;
ALTER TABLE asset_downloads ADD CONSTRAINT asset_downloads_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

ALTER TABLE asset_downloads DROP CONSTRAINT asset_downloads_lesson_id_fkey;
ALTER TABLE asset_downloads ADD CONSTRAINT asset_downloads_lesson_id_fkey
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
