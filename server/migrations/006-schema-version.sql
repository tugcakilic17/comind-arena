-- Updated only after all migrations succeed in the same transaction.
-- Bump this marker and requiredSchemaVersion when a required migration is added.
CREATE TABLE IF NOT EXISTS accounts.schema_version (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  version integer NOT NULL CHECK (version > 0)
);
INSERT INTO accounts.schema_version(singleton,version) VALUES(true,6)
  ON CONFLICT(singleton) DO UPDATE
  SET version=GREATEST(accounts.schema_version.version,EXCLUDED.version);
