-- Storage bucket for resident photos uploaded during registration
INSERT INTO storage.buckets (id, name, public)
VALUES ('extracted_images', 'extracted_images', true);

-- Per-barangay asset buckets (one bucket per barangay)
-- Example for banadero:
INSERT INTO storage.buckets (id, name, public)
VALUES ('banadero-assets', 'banadero-assets', true);

-- When adding a new barangay, create a new bucket:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('<slug>-assets', '<slug>-assets', true);
