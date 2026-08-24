-- Retire la fonctionnalité "banque de questions" (tirage aléatoire) — jugée redondante
-- avec le réordonnancement/mélange des questions déjà existant sur un quiz.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS chk_question_owner;
DROP INDEX IF EXISTS idx_questions_bank;
ALTER TABLE questions DROP COLUMN IF EXISTS question_bank_id;
ALTER TABLE questions DROP COLUMN IF EXISTS source_bank_item_id;
DROP TABLE IF EXISTS question_banks;
