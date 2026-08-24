CREATE TABLE job_offers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    company          VARCHAR(255) NOT NULL,
    description      TEXT NOT NULL,
    location         VARCHAR(255),
    contract_type    VARCHAR(20) NOT NULL,
    apply_url        VARCHAR(500),
    contact_email    VARCHAR(255),
    posted_by        UUID REFERENCES users(id),
    published        BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_offers_published ON job_offers(published, expires_at);
