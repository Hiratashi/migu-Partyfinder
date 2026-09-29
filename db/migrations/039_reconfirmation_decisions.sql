ALTER TABLE party_reconfirmations ADD COLUMN response text NOT NULL DEFAULT 'PENDING'
  CHECK (response IN ('PENDING','DECLINED'));
