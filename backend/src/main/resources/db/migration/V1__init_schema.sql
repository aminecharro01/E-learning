-- IAT Academy — initial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(30)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE formations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    published       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE modules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formation_id    UUID         NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    order_index     INTEGER      NOT NULL,
    published       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (formation_id, order_index)
);

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id       UUID         NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    order_index     INTEGER      NOT NULL,
    published       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (module_id, order_index)
);

CREATE TABLE lesson_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id       UUID         NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    block_type      VARCHAR(30)  NOT NULL,
    content         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    order_index     INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, order_index)
);

CREATE INDEX idx_lesson_blocks_lesson ON lesson_blocks(lesson_id);
CREATE INDEX idx_lesson_blocks_content ON lesson_blocks USING GIN (content);

CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        VARCHAR(255) NOT NULL,
    storage_path    VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(120) NOT NULL,
    size_bytes      BIGINT       NOT NULL,
    asset_kind      VARCHAR(30)  NOT NULL,
    duration_sec    INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE quizzes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(255) NOT NULL,
    quiz_type               VARCHAR(30)  NOT NULL,
    lesson_id               UUID REFERENCES lessons(id) ON DELETE CASCADE,
    module_id               UUID REFERENCES modules(id) ON DELETE CASCADE,
    passing_score           INTEGER      NOT NULL,
    max_attempts            INTEGER      NOT NULL,
    time_limit_seconds      INTEGER      NOT NULL DEFAULT 0,
    randomize_questions     BOOLEAN      NOT NULL DEFAULT TRUE,
    randomize_options       BOOLEAN      NOT NULL DEFAULT TRUE,
    retry_delay_hours       INTEGER      NOT NULL DEFAULT 24,
    blocking                BOOLEAN      NOT NULL DEFAULT FALSE,
    published               BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id         UUID         NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    prompt          TEXT         NOT NULL,
    question_type   VARCHAR(30)  NOT NULL,
    order_index     INTEGER      NOT NULL,
    explanation     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE answer_options (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID         NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    label           TEXT         NOT NULL,
    is_correct      BOOLEAN      NOT NULL DEFAULT FALSE,
    order_index     INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE quiz_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id         UUID         NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ  NOT NULL,
    submitted_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    score           NUMERIC(5,2),
    status          VARCHAR(30)  NOT NULL,
    question_order  JSONB,
    answers         JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);

CREATE TABLE lesson_progress (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id               UUID         NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    video_watched_percent   INTEGER      NOT NULL DEFAULT 0,
    completed               BOOLEAN      NOT NULL DEFAULT FALSE,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lesson_id)
);

CREATE TABLE certificates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    formation_id        UUID         NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
    verification_code   VARCHAR(64)  NOT NULL UNIQUE,
    issued_at           TIMESTAMPTZ  NOT NULL,
    pdf_path            VARCHAR(500),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, formation_id)
);

-- Seed formation + 20 modules (admin user is created by DataInitializer with BCrypt)
INSERT INTO formations (id, title, description, published)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'IAT Academy — Parcours Complet',
    'Formation e-learning structurée en 20 modules.',
    TRUE
);

INSERT INTO modules (formation_id, title, description, order_index, published)
SELECT
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Module ' || g,
    'Module pédagogique ' || g || ' — contenu à renseigner.',
    g - 1,
    TRUE
FROM generate_series(1, 20) AS g;
