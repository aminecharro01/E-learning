-- Devoirs (hors quiz) + carnet de notes. Le gradebook lui-même n'est pas une table :
-- c'est une vue agrégée (QuizAttempt + Submission + GradeAdjustment), construite à la
-- volée par GradebookService.
CREATE TABLE assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    due_at      TIMESTAMPTZ,
    max_score   NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Le dépôt réutilise le stockage de médias existant (assets) — pas de nouveau
-- système de fichiers pour les devoirs.
CREATE TABLE submissions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id      UUID REFERENCES assets(id) ON DELETE SET NULL,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    grade         NUMERIC(5,2),
    feedback      TEXT,
    graded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assignment_id, user_id)
);

CREATE TABLE grade_adjustments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id   UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    points      NUMERIC(5,2) NOT NULL,
    reason      TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_module ON assignments(module_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_grade_adjustments_user_module ON grade_adjustments(user_id, module_id);
