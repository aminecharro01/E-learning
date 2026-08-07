-- Banque de questions réutilisable pour générer des examens (tirage aléatoire).
-- Une question appartient à un quiz OU à une banque, jamais les deux : on relâche
-- quiz_id en nullable plutôt que de dupliquer questions/answer_options.
CREATE TABLE question_banks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(160) NOT NULL,
    description TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE questions ALTER COLUMN quiz_id DROP NOT NULL;
ALTER TABLE questions ADD COLUMN question_bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE;
-- Traçabilité : quelle question de banque a été clonée pour générer cette question de quiz.
ALTER TABLE questions ADD COLUMN source_bank_item_id UUID;

ALTER TABLE questions ADD CONSTRAINT chk_question_owner
    CHECK (quiz_id IS NOT NULL OR question_bank_id IS NOT NULL);

CREATE INDEX idx_questions_bank ON questions(question_bank_id);
