-- FIN_UF / FIN_ANNEE quiz scopes: neither a UF nor a "year" is a standalone entity
-- (a UF is just modules.uf_code, a year is just modules.year_number), so a quiz scoped
-- to one needs plain scalar columns instead of another FK like lesson_id/module_id.
-- formation_id is needed because neither has any other way to identify which formation
-- it belongs to.
ALTER TABLE quizzes ADD COLUMN formation_id UUID REFERENCES formations(id);
ALTER TABLE quizzes ADD COLUMN uf_code VARCHAR(20);
ALTER TABLE quizzes ADD COLUMN year_number INTEGER;
