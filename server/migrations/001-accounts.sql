CREATE SCHEMA IF NOT EXISTS accounts;

CREATE TABLE IF NOT EXISTS accounts.users (
  id uuid PRIMARY KEY,
  google_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts.sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON accounts.sessions(expires_at);
CREATE INDEX IF NOT EXISTS sessions_user ON accounts.sessions(user_id);

CREATE TABLE IF NOT EXISTS accounts.google_flows (
  state_hash text PRIMARY KEY,
  verifier text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS google_flows_expiry ON accounts.google_flows(expires_at);
