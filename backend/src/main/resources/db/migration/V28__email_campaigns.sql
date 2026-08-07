-- Campagnes email (newsletter). L'envoi de masse passe par une file Redis
-- (campaign:{id}:queue) drainée par un worker @Async — voir EmailCampaignService.
CREATE TABLE email_campaigns (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject          VARCHAR(255) NOT NULL,
    html_body        TEXT NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    target_audience  VARCHAR(30) NOT NULL DEFAULT 'NEWSLETTER_SUBSCRIBERS',
    target_group_id  UUID REFERENCES learner_groups(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at          TIMESTAMPTZ,
    recipient_count  INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_campaign_recipients (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id    UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name  VARCHAR(255),
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_recipients_campaign ON email_campaign_recipients(campaign_id, status);
