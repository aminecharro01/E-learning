-- Contact messages + newsletter subscribers (landing public forms)

CREATE TABLE contact_messages (
    id              UUID PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(40)  NOT NULL,
    message         TEXT         NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'NEW',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_created_at ON contact_messages (created_at DESC);
CREATE INDEX idx_contact_messages_status ON contact_messages (status);

CREATE TABLE newsletter_subscribers (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_newsletter_email UNIQUE (email)
);

CREATE INDEX idx_newsletter_subscribers_active ON newsletter_subscribers (active);
