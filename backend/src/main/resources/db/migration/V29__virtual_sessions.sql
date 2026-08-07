-- Classes virtuelles : lien externe (Zoom/Meet/Jitsi) créé manuellement par le
-- formateur — pas d'intégration API programmatique (Jitsi meet.jit.si est gratuit
-- sans clé API ; Zoom/Meet nécessiteraient une app OAuth payante, hors budget MVP).
CREATE TABLE virtual_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id        UUID REFERENCES modules(id) ON DELETE CASCADE,
    group_id         UUID REFERENCES learner_groups(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    provider         VARCHAR(20) NOT NULL,
    join_url         VARCHAR(1000) NOT NULL,
    scheduled_at     TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    reminder_sent    BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_virtual_sessions_group_scheduled ON virtual_sessions(group_id, scheduled_at);
