-- MATCHING, HOTSPOT and FILL_BLANK question types are removed from the app (backend
-- enum no longer has these values). Existing rows using them can no longer be
-- deserialized, so they must be purged rather than left orphaned. answer_options
-- cascades via its own FK to questions; these three types never had options anyway
-- (they used the metadata JSONB column instead).
DELETE FROM questions WHERE question_type IN ('MATCHING', 'HOTSPOT', 'FILL_BLANK');
