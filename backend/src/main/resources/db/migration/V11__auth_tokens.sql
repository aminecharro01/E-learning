-- Self-service password reset + email verification (Phase 1). email_verified
-- defaults true so existing users aren't retroactively locked out of anything
-- that later depends on it; only newly registered users start unverified.
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;
CREATE UNIQUE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
