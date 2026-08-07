-- Un "groupe" (learner_groups, V17) devient une vraie promo : code de millésime,
-- fenêtre de dates, et mode d'inscription (l'enum EnrollmentMode existait déjà
-- mais n'était encore relié à aucune colonne).
ALTER TABLE learner_groups ADD COLUMN code VARCHAR(30);
ALTER TABLE learner_groups ADD COLUMN start_date DATE;
ALTER TABLE learner_groups ADD COLUMN end_date DATE;
ALTER TABLE learner_groups ADD COLUMN enrollment_mode VARCHAR(20) NOT NULL DEFAULT 'HYBRIDE';

CREATE UNIQUE INDEX idx_learner_groups_code ON learner_groups(code) WHERE code IS NOT NULL;
