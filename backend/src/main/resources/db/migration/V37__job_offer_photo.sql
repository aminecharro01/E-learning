ALTER TABLE job_offers ADD COLUMN photo_asset_id UUID REFERENCES assets(id);
