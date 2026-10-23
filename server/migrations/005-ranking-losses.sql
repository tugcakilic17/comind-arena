-- Store the actual signed change; the award transaction clamps each balance at zero.
ALTER TABLE arena.awards DROP CONSTRAINT IF EXISTS awards_points_check;
ALTER TABLE arena.awards ADD CONSTRAINT awards_points_check CHECK (points >= -10);
