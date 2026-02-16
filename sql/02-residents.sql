CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT,
  birthdate DATE,
  age INTEGER,
  gender TEXT,
  civil_status TEXT,
  citizenship TEXT NOT NULL DEFAULT 'Filipino',
  purok TEXT,
  contact TEXT,
  photo_url TEXT,
  barangay_id UUID REFERENCES barangays(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_residents_first_name ON residents USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_residents_last_name ON residents USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_residents_barangay ON residents (barangay_id);
