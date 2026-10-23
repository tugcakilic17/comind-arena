ALTER TABLE accounts.google_flows ADD COLUMN IF NOT EXISTS return_url text;
CREATE SCHEMA IF NOT EXISTS arena;
CREATE TABLE IF NOT EXISTS arena.rooms (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  host_id uuid NOT NULL REFERENCES accounts.users(id),
  guest_id uuid REFERENCES accounts.users(id),
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (guest_id IS NULL OR guest_id <> host_id)
);
CREATE TABLE IF NOT EXISTS arena.active_players (
  user_id uuid PRIMARY KEY REFERENCES accounts.users(id),
  room_id uuid NOT NULL REFERENCES arena.rooms(id)
);
CREATE TABLE IF NOT EXISTS arena.awards (
  room_id uuid NOT NULL REFERENCES arena.rooms(id),
  user_id uuid NOT NULL REFERENCES accounts.users(id),
  points integer NOT NULL CHECK(points >= 0),
  outcome text NOT NULL CHECK(outcome IN ('win','draw','loss')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_id,user_id)
);
CREATE INDEX IF NOT EXISTS awards_user ON arena.awards(user_id);
CREATE TABLE IF NOT EXISTS accounts.app_progress (
  user_id uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  app text NOT NULL CHECK(app='kesif'),
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,app)
);
