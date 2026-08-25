-- Was stored in hours; the admin UI now configures it in minutes for finer control
-- (e.g. 30 min between attempts, not just whole hours). Convert existing values so the
-- actual delay behavior is unchanged for quizzes already configured.
ALTER TABLE quizzes RENAME COLUMN retry_delay_hours TO retry_delay_minutes;
UPDATE quizzes SET retry_delay_minutes = retry_delay_minutes * 60;
ALTER TABLE quizzes ALTER COLUMN retry_delay_minutes SET DEFAULT 1440;
