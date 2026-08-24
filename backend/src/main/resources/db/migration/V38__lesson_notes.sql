-- Notes personnelles d'un apprenant sur une leçon — strictement privées, jamais
-- exposées à un autre utilisateur (voir LessonNoteService : toujours filtré par user_id).
CREATE TABLE lesson_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_notes_user_lesson ON lesson_notes(user_id, lesson_id);
