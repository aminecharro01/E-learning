-- Programmation de contenu par groupe : le directeur ouvre un module (ou une UF,
-- résolue en un enregistrement par module côté service) immédiatement ou à une
-- date future. unlock_at NULL = accès immédiat ; l'accès est calculé à la volée
-- (unlock_at <= now()), sans tâche planifiée.
CREATE TABLE group_content_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES learner_groups(id) ON DELETE CASCADE,
    module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    uf_code         VARCHAR(60),
    unlock_at       TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, module_id)
);

CREATE INDEX idx_gca_group ON group_content_assignments(group_id);
