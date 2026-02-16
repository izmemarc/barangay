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

  -- Google Docs template IDs (JSON: key = template name, value = Google Doc ID)
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

CREATE INDEX idx_barangays_domain ON barangays (domain) WHERE is_active = true;
CREATE INDEX idx_barangays_slug ON barangays (slug) WHERE is_active = true;
