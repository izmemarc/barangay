# Phase 1: Start Small ($54/month)

Deploy just Banadero with 1 app server + 1 load balancer.

## Servers to Purchase

### 1. Load Balancer
- **Provider:** Hetzner
- **Plan:** CX22 (2GB RAM, 2 CPU, 40GB SSD)
- **Location:** Falkenstein, Germany (or Hillsboro, USA)
- **Cost:** $6.49/month
- **Purpose:** Routes traffic, handles SSL

### 2. App Server
- **Provider:** Vultr
- **Plan:** High Performance 8GB (4 CPU, 160GB SSD)
- **Location:** Manila, Philippines
- **Cost:** $48/month
- **Purpose:** Runs banadero Next.js app

### 3. Database
- **Provider:** Supabase
- **Plan:** Free Tier
- **Cost:** $0/month
- **Purpose:** PostgreSQL + Storage

**Total: $54.49/month**

---

## Step 1: Create Supabase Database

1. Go to https://supabase.com
2. Create new project (choose free tier)
3. Run SQL files in order (SQL Editor):
   - [sql/00-extensions.sql](../sql/00-extensions.sql)
   - [sql/01-barangays.sql](../sql/01-barangays.sql)
   - [sql/02-residents.sql](../sql/02-residents.sql)
   - [sql/03-clearance-submissions.sql](../sql/03-clearance-submissions.sql)
   - [sql/04-pending-registrations.sql](../sql/04-pending-registrations.sql)
   - [sql/05-storage.sql](../sql/05-storage.sql)
   - [sql/06-rls-policies.sql](../sql/06-rls-policies.sql)
   - [sql/07-seed-banadero.sql](../sql/07-seed-banadero.sql)

4. Update the banadero row with your actual data (officials, services, etc.)
5. Copy Supabase URL and keys to `.env.local`

---

## Step 2: Create Servers

### Vultr App Server (Manila)
```bash
# SSH as root
ssh root@<vultr-ip>

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install pnpm and PM2
npm install -g pnpm pm2

# Install Nginx
apt install -y nginx

# Create app user
useradd -m -s /bin/bash barangay
su - barangay
```

### Clone and build:
```bash
cd /home/barangay
git clone <your-repo> barangay
cd barangay

# Copy env file
cp sites/banadero/.env.local.example sites/banadero/.env.local
nano sites/banadero/.env.local  # Add your Supabase credentials

# Install dependencies
pnpm install

# Build banadero
cd sites/banadero
pnpm build
cd ../..

# Start with PM2 (just banadero)
pm2 start --name banadero "pnpm --filter @barangay/banadero start" -- --port 3001
pm2 save
pm2 startup  # Follow instructions
```

### Configure Nginx on app server:
```bash
# Exit barangay user, back to root
exit

# Create nginx config
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
    }
}
EOF

# Test and reload
nginx -t
systemctl reload nginx

# Test locally
curl http://localhost
```

---

## Step 3: Setup Load Balancer (Hetzner)

```bash
# SSH to Hetzner server
ssh root@<hetzner-ip>

# Update system
apt update && apt upgrade -y

# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
cat > /etc/nginx/sites-available/default <<'EOF'
# Upstream app server
upstream app_server {
    server <VULTR-PRIVATE-IP>:80;  # Replace with Vultr private IP
    keepalive 32;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name banaderolegazpi.online www.banaderolegazpi.online;
    return 301 https://$host$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name banaderolegazpi.online www.banaderolegazpi.online;

    # SSL (certbot will add these)
    # ssl_certificate /etc/letsencrypt/live/banaderolegazpi.online/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/banaderolegazpi.online/privkey.pem;

    location / {
        proxy_pass http://app_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
EOF

# Test config
nginx -t

# Get SSL certificate
certbot --nginx -d banaderolegazpi.online -d www.banaderolegazpi.online

# Reload nginx
systemctl reload nginx
```

---

## Step 4: DNS Setup

Point your domain to the **Load Balancer IP** (Hetzner):

```
Type: A
Name: @
Value: <HETZNER-IP>
TTL: 3600

Type: A
Name: www
Value: <HETZNER-IP>
TTL: 3600
```

Wait 5-10 minutes for DNS to propagate.

---

## Step 5: Test

```bash
# From your local machine
curl https://banaderolegazpi.online

# Should return your banadero homepage!
```

---

## Monitoring

```bash
# On app server
pm2 monit
pm2 logs banadero

# Check Nginx logs
tail -f /var/log/nginx/access.log
```

---

## Next Steps

Once this is stable:
- **Phase 2:** Add 2nd app server + 2nd load balancer (redundancy)
- **Phase 3:** Add more barangay sites
- **Phase 4:** Scale to 70 sites

---

## Cost Breakdown

```
Hetzner Load Balancer:  $6.49/mo
Vultr App Server:       $48/mo
Supabase Free:          $0/mo
─────────────────────────────────
TOTAL:                  $54.49/mo
```

For just **1 site running 24/7 with no brownouts!**
