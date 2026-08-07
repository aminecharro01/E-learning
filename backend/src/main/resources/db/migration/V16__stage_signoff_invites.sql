-- Scoped, single-use, token-gated invite letting an external stage tutor (who has
-- no user account) sign off exactly one UF validation, without a second
-- registration/auth system. Token possession is the only credential.
CREATE TABLE stage_signoff_invites (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uf_validation_id    UUID NOT NULL REFERENCES learner_uf_validations(id) ON DELETE CASCADE,
    token               VARCHAR(255) NOT NULL UNIQUE,
    tutor_email         VARCHAR(255) NOT NULL,
    tutor_name          VARCHAR(255),
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stage_signoff_invites_token ON stage_signoff_invites(token);
