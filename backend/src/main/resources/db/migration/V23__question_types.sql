-- Nouveaux types de question : MATCHING, HOTSPOT, FILL_BLANK, ESSAY. La config
-- spécifique à chaque type (paires, zones, texte à trous) vit dans une colonne JSON
-- plutôt que d'ajouter des colonnes dédiées par type — pattern déjà utilisé par
-- quiz_attempts (answers/question_order).
ALTER TABLE questions ADD COLUMN metadata JSONB;

-- Réponses "libres" (FILL_BLANK, ESSAY, MATCHING, HOTSPOT) : colonnes séparées de
-- "answers" (choix multiples existants) pour ne rien changer au contrat déjà en
-- place sur SINGLE_CHOICE/MULTI_CHOICE/TRUE_FALSE.
ALTER TABLE quiz_attempts ADD COLUMN free_text_answers JSONB;
ALTER TABLE quiz_attempts ADD COLUMN structured_answers JSONB;

-- Une tentative contenant au moins une question ESSAY reste PENDING_REVIEW tant
-- qu'elle n'est pas corrigée manuellement (voir essay_grades).
-- (Pas de contrainte CHECK sur la colonne status existante : AttemptStatus gagne
-- juste une valeur d'enum de plus côté application.)

CREATE TABLE essay_grades (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id  UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    score       NUMERIC(5,2) NOT NULL,
    feedback    TEXT,
    graded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX idx_essay_grades_attempt ON essay_grades(attempt_id);
