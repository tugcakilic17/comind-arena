-- Keep the UUID identity shared by both games; expose a short, permanent player code.
ALTER TABLE accounts.users ADD COLUMN IF NOT EXISTS public_code text;
ALTER TABLE accounts.users ADD COLUMN IF NOT EXISTS avatar text NOT NULL DEFAULT 'white';

CREATE OR REPLACE FUNCTION accounts.new_player_code() RETURNS text AS $$
  SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ',1+floor(random()*24)::integer,1),'')
    || lpad(floor(random()*10000)::integer::text,4,'0') FROM generate_series(1,4);
$$ LANGUAGE sql VOLATILE;

CREATE UNIQUE INDEX IF NOT EXISTS users_public_code_key ON accounts.users(public_code);
DO $$
DECLARE player record;
BEGIN
  FOR player IN SELECT id FROM accounts.users WHERE public_code IS NULL LOOP
    LOOP
      BEGIN
        UPDATE accounts.users SET public_code=accounts.new_player_code() WHERE id=player.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Retry a random-code collision, preserving every existing account and session.
      END;
    END LOOP;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='accounts.users'::regclass AND conname='users_public_code_format') THEN
    ALTER TABLE accounts.users ADD CONSTRAINT users_public_code_format CHECK(public_code ~ '^[A-Z]{4}[0-9]{4}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='accounts.users'::regclass AND conname='users_avatar_choice') THEN
    ALTER TABLE accounts.users ADD CONSTRAINT users_avatar_choice CHECK(avatar IN ('white','lilac','rose'));
  END IF;
END $$;
ALTER TABLE accounts.users ALTER COLUMN public_code SET DEFAULT accounts.new_player_code();
ALTER TABLE accounts.users ALTER COLUMN public_code SET NOT NULL;
