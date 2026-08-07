-- Groupes présentiel/hybride : le directeur constitue une promo et lui programme
-- le contenu (V19). "groups" est un mot réservé SQL — table nommée learner_groups.
CREATE TABLE learner_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(160) NOT NULL,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK simple (pas de table de jointure) : un apprenant appartient à un seul groupe
-- à la fois, donc une réaffectation est un simple UPDATE et la règle est garantie
-- par le schéma lui-même.
ALTER TABLE users ADD COLUMN group_id UUID REFERENCES learner_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_users_group_id ON users(group_id);
