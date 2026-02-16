CREATE TABLE pending_registrations (
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
  status TEXT NOT NULL DEFAULT 'pending',
  photo_url TEXT,
  barangay_id UUID REFERENCES barangays(id),
  processed_by TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_registrations_barangay ON pending_registrations (barangay_id);
CREATE INDEX idx_registrations_status ON pending_registrations (status);
