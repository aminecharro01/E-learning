-- Forums de discussion : transforme les commentaires de leçon (plats) en fils de
-- discussion, ajoute le forum par module, et l'épinglage par le staff.
-- lesson_id devient optionnel car un commentaire peut désormais cibler un module
-- entier (forum général) plutôt qu'une leçon précise.
ALTER TABLE lesson_comments ALTER COLUMN lesson_id DROP NOT NULL;
ALTER TABLE lesson_comments ADD COLUMN module_id UUID REFERENCES modules(id) ON DELETE CASCADE;
ALTER TABLE lesson_comments ADD COLUMN parent_id UUID REFERENCES lesson_comments(id) ON DELETE CASCADE;
ALTER TABLE lesson_comments ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lesson_comments ADD CONSTRAINT chk_comment_target
    CHECK (lesson_id IS NOT NULL OR module_id IS NOT NULL);

CREATE INDEX idx_lesson_comments_module ON lesson_comments(module_id);
CREATE INDEX idx_lesson_comments_parent ON lesson_comments(parent_id);
