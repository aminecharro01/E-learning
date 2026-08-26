CREATE TABLE asset_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    lesson_id UUID REFERENCES lessons(id),
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_downloads_user_asset ON asset_downloads(user_id, asset_id);
