-- 2FA optionnelle (TOTP, RFC 6238). Désactivée par défaut — n'affecte aucun compte
-- existant. Le secret n'est jamais exposé dans UserResponse (même vigilance que le
-- mot de passe).
ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
