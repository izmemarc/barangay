-- Enable RLS on all tables
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.

-- Barangays: public read (active only)
CREATE POLICY "Public can read active barangays"
  ON barangays FOR SELECT
  USING (is_active = true);

-- Residents: anon can search (read)
CREATE POLICY "Anon can read residents"
  ON residents FOR SELECT
  USING (true);

-- Clearance submissions: anon can insert and read
CREATE POLICY "Anon can insert submissions"
  ON clearance_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can read submissions"
  ON clearance_submissions FOR SELECT
  USING (true);

-- Pending registrations: anon can insert
CREATE POLICY "Anon can insert registrations"
  ON pending_registrations FOR INSERT
  WITH CHECK (true);

-- Storage policies
CREATE POLICY "Public read extracted_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'extracted_images');

CREATE POLICY "Anon can upload to extracted_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'extracted_images');
