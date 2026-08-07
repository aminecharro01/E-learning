-- Badge catalog (code/label/icon/description) lives in Java (BadgeCode enum) since
-- it's a small fixed rule set, not editable content — only earned badges are persisted.
CREATE TABLE user_badges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_code      VARCHAR(50) NOT NULL,
    awarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_code)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
