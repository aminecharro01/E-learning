-- Temps passé par leçon/module/jour. Une ligne par (utilisateur, leçon, jour) — pas
-- par évènement brut : le service agrège d'abord dans Redis (heartbeats client) et ne
-- flush ici qu'une fois par heure, sinon le volume d'écriture exploserait.
CREATE TABLE time_tracking_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id    UUID REFERENCES lessons(id) ON DELETE CASCADE,
    module_id    UUID REFERENCES modules(id) ON DELETE CASCADE,
    event_date   DATE NOT NULL,
    seconds_spent INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id, event_date)
);

CREATE INDEX idx_time_tracking_module_date ON time_tracking_logs(module_id, event_date);
