CREATE TABLE IF NOT EXISTS accounts.friendships (
  user_a uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_a,user_b),
  CHECK(user_a < user_b),
  CHECK(requester_id IN (user_a,user_b))
);
CREATE INDEX IF NOT EXISTS friendships_user_b ON accounts.friendships(user_b);
CREATE TABLE IF NOT EXISTS arena.invites (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES arena.rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES accounts.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id,receiver_id),
  CHECK(sender_id <> receiver_id)
);
CREATE INDEX IF NOT EXISTS invites_receiver ON arena.invites(receiver_id,status);
