# New Barangay Site Setup

## Steps

1. Copy this folder: `cp -r sites/_template sites/<slug>`
2. Update `package.json`:
   - Change `"name"` to `"@barangay/<slug>"`
   - Change `TEMPLATE_PORT` to your port number (3002, 3003, etc.)
3. Insert a row in the `barangays` table in Supabase with:
   - `slug`, `name`, `full_name`, `city`, `province`
   - `domain` (your production domain)
   - `primary_color`, `tagline`, `phone`, `email`
   - `mission`, `vision`, `officials` (JSON array)
4. Create `.env.local` from `.env.local.example` and fill in credentials
   - Set `BARANGAY_SLUG=<slug>` for local development
5. Replace images in `public/`:
   - `logo.png` and `logo.webp` (barangay logo)
   - Add officer photos, project images, etc.
6. Customize components in `components/`:
   - `header.tsx` — navigation items, layout
   - `hero-section.tsx` — hero design, services grid
   - `home-client.tsx` — add custom sections
7. Add domain->port mapping in:
   - `deployment/ecosystem.config.js` (PM2)
   - `deployment/nginx/barangay-sites.conf` (Nginx)
8. Run `pnpm install` at workspace root, then `pnpm dev:<slug>`
