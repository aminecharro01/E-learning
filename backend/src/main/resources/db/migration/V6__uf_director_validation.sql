-- Validation directeur des UF Stage (UF 5) et Soutenance (UF 11)

CREATE TABLE learner_uf_validations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uf_code         VARCHAR(20)  NOT NULL,
    validated       BOOLEAN      NOT NULL DEFAULT FALSE,
    validated_at    TIMESTAMPTZ,
    validated_by    UUID REFERENCES users(id),
    note            TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (learner_id, uf_code)
);
