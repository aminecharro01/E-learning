-- Isole les quiz "questions à choix (auto-corrigées)" des quiz "réponse libre
-- (correction manuelle)" : le mode est fixé à la création et verrouille le
-- type de question acceptable pour tout le quiz (jamais de mélange).
ALTER TABLE quizzes ADD COLUMN question_mode VARCHAR(20) NOT NULL DEFAULT 'AUTO_GRADED';

-- Rétro-classe les quiz existants d'après leur contenu réel plutôt que de tout
-- figer sur la valeur par défaut.
UPDATE quizzes q
SET question_mode = 'OPEN_ENDED'
WHERE EXISTS (
    SELECT 1 FROM questions qu
    WHERE qu.quiz_id = q.id AND qu.question_type = 'ESSAY'
);

ALTER TABLE quizzes ALTER COLUMN question_mode DROP DEFAULT;
