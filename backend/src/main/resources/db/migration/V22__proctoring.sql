-- Anti-triche optionnel, activable par quiz (jamais par défaut — opt-in explicite
-- du directeur/formateur à la création ou l'édition d'un quiz).
ALTER TABLE quizzes ADD COLUMN proctoring_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN focus_loss_detection BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN copy_protection BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE quizzes ADD COLUMN lockdown_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Table dédiée (plutôt que le journal d'audit générique) pour rester filtrable
-- efficacement par tentative lors de la relecture par le staff.
CREATE TABLE proctoring_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id  UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    event_type  VARCHAR(30) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meta        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proctoring_events_attempt ON proctoring_events(attempt_id);
