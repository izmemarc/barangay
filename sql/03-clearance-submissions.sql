CREATE TABLE clearance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clearance_type TEXT NOT NULL,
  name TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  resident_id UUID REFERENCES residents(id),
  status TEXT NOT NULL DEFAULT 'pending',
  barangay_id UUID REFERENCES barangays(id),
  document_url TEXT,
  processed_by TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Valid clearance_type values:
--   barangay, business, blotter, facility, good-moral,
--   indigency, residency, barangay-id, cso-accreditation, luntian

CREATE INDEX idx_submissions_barangay ON clearance_submissions (barangay_id);
CREATE INDEX idx_submissions_status ON clearance_submissions (status);
CREATE INDEX idx_submissions_type ON clearance_submissions (clearance_type);
