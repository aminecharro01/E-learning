-- Dossier Stage / Soutenance + remise physique du diplôme

CREATE TABLE learner_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type        VARCHAR(40)  NOT NULL,
    asset_id        UUID         NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    uploaded_by     UUID         NOT NULL REFERENCES users(id),
    notes           TEXT,
    status          VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_learner_documents_learner ON learner_documents(learner_id);
CREATE INDEX idx_learner_documents_type ON learner_documents(learner_id, doc_type);

ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS physically_delivered BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_note TEXT;
