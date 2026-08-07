-- Comptes créés en masse (import Excel présentiel) : connexion initiale par
-- matricule/CIN, puis complétion du profil (email réel, téléphone, photo, nouveau
-- mot de passe) qui bascule le compte sur l'authentification email standard.
ALTER TABLE users ADD COLUMN matricule VARCHAR(60);

-- DEFAULT TRUE : les comptes existants ne sont pas impactés (même approche que
-- email_verified dans V11) — seuls les comptes importés démarrent à false.
ALTER TABLE users ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX idx_users_matricule ON users(matricule) WHERE matricule IS NOT NULL;
