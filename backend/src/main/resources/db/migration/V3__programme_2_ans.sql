-- Programme IAT 2 ans : métadonnées modules + profil apprenant + seed 36 modules

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS cin VARCHAR(40),
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS enrollment_year INTEGER,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

ALTER TABLE modules
    ADD COLUMN IF NOT EXISTS code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS year_number INTEGER,
    ADD COLUMN IF NOT EXISTS uf_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS uf_title VARCHAR(255);

UPDATE formations
SET title = 'IAT Academy — Cycle Complet (2 ans)',
    description = 'Formation Hôtesse / Steward / Tourisme & Aéronautique structurée en 2 années, 11 unités de formation et 36 modules.',
    updated_at = NOW()
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Purge contenu catalogue existant (tents / progression leçons liées)
DELETE FROM quiz_attempts
WHERE quiz_id IN (
    SELECT q.id
    FROM quizzes q
    LEFT JOIN modules m ON q.module_id = m.id
    LEFT JOIN lessons l ON q.lesson_id = l.id
    LEFT JOIN modules m2 ON l.module_id = m2.id
    WHERE m.formation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
       OR m2.formation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

DELETE FROM lesson_progress
WHERE lesson_id IN (
    SELECT l.id
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.formation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

DELETE FROM modules
WHERE formation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

INSERT INTO modules (
    formation_id, code, title, description, order_index, year_number, uf_code, uf_title, published
) VALUES
-- Année 1 — UF 1
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '1-1', 'Techniques de communication', 'UF 1 — Langues et communication', 0, 1, 'UF 1', 'Langues et communication', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '1-2', 'Français', 'UF 1 — Langues et communication', 1, 1, 'UF 1', 'Langues et communication', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '1-3', 'Anglais', 'UF 1 — Langues et communication', 2, 1, 'UF 1', 'Langues et communication', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '1-4', 'Comportement et attitude', 'UF 1 — Langues et communication', 3, 1, 'UF 1', 'Langues et communication', TRUE),
-- UF 2
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2-1', 'Techniques d''animation', 'UF 2 — Exploitation touristique et aéroportuaire', 4, 1, 'UF 2', 'Exploitation touristique et aéroportuaire', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2-2', 'Accueil et réception', 'UF 2 — Exploitation touristique et aéroportuaire', 5, 1, 'UF 2', 'Exploitation touristique et aéroportuaire', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2-3', 'Exploitation des aéroports', 'UF 2 — Exploitation touristique et aéroportuaire', 6, 1, 'UF 2', 'Exploitation touristique et aéroportuaire', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2-4', 'Techniques d''agence de voyage', 'UF 2 — Exploitation touristique et aéroportuaire', 7, 1, 'UF 2', 'Exploitation touristique et aéroportuaire', TRUE),
-- UF 3
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '3-1', 'Connaissances aéronautiques (Français)', 'UF 3 — Environnement aéronautique', 8, 1, 'UF 3', 'Environnement aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '3-2', 'Connaissances aéronautiques (Anglais)', 'UF 3 — Environnement aéronautique', 9, 1, 'UF 3', 'Environnement aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '3-3', 'Réglementation (droit aérien, marchandises dangereuses et sûreté)', 'UF 3 — Environnement aéronautique', 10, 1, 'UF 3', 'Environnement aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '3-4', 'Connaissances de base en secourisme', 'UF 3 — Environnement aéronautique', 11, 1, 'UF 3', 'Environnement aéronautique', TRUE),
-- UF 4
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '4-1', 'Marketing touristique et gestion commerciale', 'UF 4 — Connaissances générales complémentaires', 12, 1, 'UF 4', 'Connaissances générales complémentaires', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '4-2', 'Législation générale et spécifique (généralité et F/ PNC)', 'UF 4 — Connaissances générales complémentaires', 13, 1, 'UF 4', 'Connaissances générales complémentaires', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '4-3', 'Economie et sociologie du Tourisme', 'UF 4 — Connaissances générales complémentaires', 14, 1, 'UF 4', 'Connaissances générales complémentaires', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '4-4', 'Géographie touristique', 'UF 4 — Connaissances générales complémentaires', 15, 1, 'UF 4', 'Connaissances générales complémentaires', TRUE),
-- UF 5
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '5-1', 'Stage en milieu réel', 'UF 5 — Stage en milieu réel', 16, 1, 'UF 5', 'Stage en milieu réel', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '5-2', 'Rapport de stage', 'UF 5 — Stage en milieu réel', 17, 1, 'UF 5', 'Stage en milieu réel', TRUE),
-- Année 2 — UF 6
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '6-1', 'Français (touristique)', 'UF 6 — Techniques d''expression', 18, 2, 'UF 6', 'Techniques d''expression', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '6-2', 'Anglais (touristique)', 'UF 6 — Techniques d''expression', 19, 2, 'UF 6', 'Techniques d''expression', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '6-3', 'Espagnol', 'UF 6 — Techniques d''expression', 20, 2, 'UF 6', 'Techniques d''expression', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '6-4', 'Anglais technique', 'UF 6 — Techniques d''expression', 21, 2, 'UF 6', 'Techniques d''expression', TRUE),
-- UF 7
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7-1', 'Guidage et accompagnement', 'UF 7 — Gestion et exploitation touristiques', 22, 2, 'UF 7', 'Gestion et exploitation touristiques', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7-2', 'Restauration et hygiène', 'UF 7 — Gestion et exploitation touristiques', 23, 2, 'UF 7', 'Gestion et exploitation touristiques', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7-3', 'Technique d''annonce et d''assistance', 'UF 7 — Gestion et exploitation touristiques', 24, 2, 'UF 7', 'Gestion et exploitation touristiques', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '7-4', 'Technique d''animation', 'UF 7 — Gestion et exploitation touristiques', 25, 2, 'UF 7', 'Gestion et exploitation touristiques', TRUE),
-- UF 8
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '8-1', 'Sécurité dans les avions', 'UF 8 — Exploitation aéronautique', 26, 2, 'UF 8', 'Exploitation aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '8-2', 'Safety and first aid', 'UF 8 — Exploitation aéronautique', 27, 2, 'UF 8', 'Exploitation aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '8-3', 'Sauvetage et secourisme', 'UF 8 — Exploitation aéronautique', 28, 2, 'UF 8', 'Exploitation aéronautique', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '8-4', 'CRM (crew ressource management)', 'UF 8 — Exploitation aéronautique', 29, 2, 'UF 8', 'Exploitation aéronautique', TRUE),
-- UF 9
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '9-1', 'Applications informatiques et bureautiques', 'UF 9 — Connaissances et outils de gestion', 30, 2, 'UF 9', 'Connaissances et outils de gestion', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '9-2', 'Techniques de vente', 'UF 9 — Connaissances et outils de gestion', 31, 2, 'UF 9', 'Connaissances et outils de gestion', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '9-3', 'Monde contemporain, histoire et civilisation', 'UF 9 — Connaissances et outils de gestion', 32, 2, 'UF 9', 'Connaissances et outils de gestion', TRUE),
-- UF 10
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10-1', 'Recherche d''emploi', 'UF 10 — Culture d''entreprise', 33, 2, 'UF 10', 'Culture d''entreprise', TRUE),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10-2', 'Création d''entreprise', 'UF 10 — Culture d''entreprise', 34, 2, 'UF 10', 'Culture d''entreprise', TRUE),
-- UF 11
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11-1', 'Soutenance', 'UF 11 — Travaux de synthèse', 35, 2, 'UF 11', 'Travaux de synthèse', TRUE);

CREATE UNIQUE INDEX IF NOT EXISTS uq_modules_formation_code
    ON modules (formation_id, code);
