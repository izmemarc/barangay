# Database Schema

Supabase (PostgreSQL) database schema for the Barangay monorepo.

## Tables

| Table | Purpose |
|-------|---------|
| `barangays` | Multi-tenant config - one row per barangay site |
| `residents` | Registered residents per barangay |
| `clearance_submissions` | Clearance/certificate requests from residents |
| `pending_registrations` | Resident registration requests awaiting admin approval |

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `extracted_images` | Resident photos uploaded during registration (shared across all barangays) |
| `<slug>-assets` | One bucket per barangay for logos, hero images, official photos, etc. (e.g., `banadero-assets`, `site2-assets`) |

---

## SQL: Create Tables

Run these in the Supabase SQL Editor (`https://app.supabase.com/project/_/sql`).

### 1. `barangays`

```sql
CREATE TABLE barangays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Basic info
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a5632',
  tagline TEXT NOT NULL DEFAULT '',
  mission TEXT,
  vision TEXT,

  -- Google OAuth / Drive
  google_client_id TEXT,
  google_client_secret TEXT,
  google_refresh_token TEXT,
  google_redirect_uri TEXT,
  google_drive_output_folder_id TEXT,
  google_drive_photo_folder_id TEXT,

  -- Google Docs template IDs (JSON object: key = template name, value = Google Doc ID)
  template_ids JSONB NOT NULL DEFAULT '{}',

  -- PhilSMS
  philsms_api_token TEXT,
  philsms_notification_number TEXT,
  philsms_sender_id TEXT NOT NULL DEFAULT 'PhilSMS',

  -- Site content (JSON)
  officials JSONB NOT NULL DEFAULT '[]',
  services JSONB NOT NULL DEFAULT '[]',
  contacts JSONB NOT NULL DEFAULT '[]',
  office_hours JSONB NOT NULL DEFAULT '[]',
  projects JSONB NOT NULL DEFAULT '{}',
  disclosure_links JSONB NOT NULL DEFAULT '[]',
  google_form_urls JSONB NOT NULL DEFAULT '{}',

  -- Admin
  admin_password_hash TEXT,

  -- Assets (bucket name: '<slug>-assets', e.g. 'banadero-assets')
  asset_bucket TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for domain lookups
CREATE INDEX idx_barangays_domain ON barangays (domain) WHERE is_active = true;
CREATE INDEX idx_barangays_slug ON barangays (slug) WHERE is_active = true;
```

### 2. `residents`

```sql
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

-- Indexes for name search
CREATE INDEX idx_residents_first_name ON residents USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_residents_last_name ON residents USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_residents_barangay ON residents (barangay_id);
```

### 3. `clearance_submissions`

```sql
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

-- Valid clearance types: barangay, business, blotter, facility, good-moral,
--   indigency, residency, barangay-id, cso-accreditation, luntian

CREATE INDEX idx_submissions_barangay ON clearance_submissions (barangay_id);
CREATE INDEX idx_submissions_status ON clearance_submissions (status);
CREATE INDEX idx_submissions_type ON clearance_submissions (clearance_type);
```

### 4. `pending_registrations`

```sql
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
  photo_path TEXT,
  barangay_id UUID REFERENCES barangays(id),
  processed_by TEXT,
  processed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_registrations_barangay ON pending_registrations (barangay_id);
CREATE INDEX idx_registrations_status ON pending_registrations (status);
```

---

## SQL: Enable Extensions

The trigram extension is needed for fuzzy name search on `residents`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## SQL: Storage Buckets

Run in Supabase SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('extracted_images', 'extracted_images', true);
```

For per-barangay asset buckets (e.g. logos, hero images):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('banadero-assets', 'banadero-assets', true);
```

---

## SQL: Row-Level Security (RLS)

Enable RLS on all tables and allow service-role full access. Public (anon) access is restricted.

```sql
-- Enable RLS
ALTER TABLE barangays ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearance_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- For anon key: allow reads on barangays, inserts on submissions/registrations.

-- Barangays: public read (active only)
CREATE POLICY "Public can read active barangays"
  ON barangays FOR SELECT
  USING (is_active = true);

-- Residents: anon can search (read)
CREATE POLICY "Anon can read residents"
  ON residents FOR SELECT
  USING (true);

-- Clearance submissions: anon can insert and read own
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

-- Storage: allow public reads, authenticated uploads
CREATE POLICY "Public read extracted_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'extracted_images');

CREATE POLICY "Anon can upload to extracted_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'extracted_images');
```

---

## SQL: Seed Data (Banadero)

Insert the banadero barangay row to get the site working:

```sql
INSERT INTO barangays (
  slug,
  domain,
  is_active,
  name,
  full_name,
  city,
  province,
  phone,
  email,
  primary_color,
  tagline,
  mission,
  vision,
  google_client_id,
  google_client_secret,
  google_refresh_token,
  google_redirect_uri,
  google_drive_output_folder_id,
  google_drive_photo_folder_id,
  template_ids,
  philsms_api_token,
  philsms_notification_number,
  philsms_sender_id,
  officials,
  services,
  contacts,
  office_hours,
  projects,
  disclosure_links,
  google_form_urls,
  admin_password_hash,
  asset_bucket
) VALUES (
  'banadero',
  'banaderolegazpi.online',
  true,
  'Banadero',
  'Barangay Banadero',
  'Legazpi City',
  'Albay',
  NULL,  -- phone
  NULL,  -- email
  '#1a5632',
  'Your tagline here',
  NULL,  -- mission
  NULL,  -- vision
  NULL,  -- google_client_id (set from .env.local or update here)
  NULL,  -- google_client_secret
  NULL,  -- google_refresh_token
  NULL,  -- google_redirect_uri
  NULL,  -- google_drive_output_folder_id
  NULL,  -- google_drive_photo_folder_id
  '{
    "barangay": "",
    "residency": "",
    "good_moral": "",
    "indigency": "",
    "business": "",
    "facility": "",
    "blotter": "",
    "luntian": "",
    "cso_accreditation": "",
    "barangay_id": "",
    "cso_accreditation_page2": ""
  }'::jsonb,
  NULL,  -- philsms_api_token
  NULL,  -- philsms_notification_number
  'PhilSMS',
  '[]'::jsonb,   -- officials
  '[]'::jsonb,   -- services
  '[]'::jsonb,   -- contacts
  '[]'::jsonb,   -- office_hours
  '{}'::jsonb,   -- projects
  '[]'::jsonb,   -- disclosure_links
  '{}'::jsonb,   -- google_form_urls
  NULL,          -- admin_password_hash
  'banadero-assets'
);
```

After inserting, grab the generated `id` (UUID) — that's your `barangay_id` used to filter residents, submissions, and registrations.

---

## Adding a New Barangay

1. Create a new storage bucket: `INSERT INTO storage.buckets (id, name, public) VALUES ('<slug>-assets', '<slug>-assets', true);`
2. Insert a new row into `barangays` with `asset_bucket = '<slug>-assets'`
3. Upload assets to the bucket: logos, hero images, official photos, etc.
4. Set `BARANGAY_SLUG=<slug>` in the new site's `.env.local`
5. All residents/submissions/registrations automatically filter by `barangay_id`

---

## Schema Diagram

```
barangays (1)
  |
  |-- (1:N) --> residents
  |-- (1:N) --> clearance_submissions
  |-- (1:N) --> pending_registrations

residents (1)
  |-- (1:N) --> clearance_submissions (via resident_id)
```
