# Load Balancer + App Servers Setup Guide

Architecture: 1 Load Balancer + 2 App Servers

## Server Requirements

### Load Balancer (Entry Point)
- **VPS:** 2GB RAM, 1 CPU, 20GB SSD
- **Cost:** ~$12/month
- **Role:** Routes traffic, handles SSL, distributes load
- **Software:** Nginx only

### App Server 1 & 2 (Runs Next.js Apps)
- **VPS:** 16GB RAM, 4 CPU, 100GB SSD each
- **Cost:** ~$50/month each
- **Role:** Runs all 70 PM2 processes
- **Software:** Node.js, PM2, Nginx

**Total Cost:** ~$112/month for 70 sites with high availability

---

## Step 1: Provision Servers

Get 3 VPS instances (DigitalOcean, Hetzner, Vultr):

```
Load Balancer:  123.45.67.89  (public IP)
App Server 1:   10.0.1.10     (private IP, same datacenter)
App Server 2:   10.0.1.11     (private IP, same datacenter)
```

⚠️ **Important:** Use private networking for app servers (faster, free bandwidth)

---

## Step 2: DNS Setup

Point ALL 70 domains to the **Load Balancer IP only**:

```
banaderolegazpi.online  → A  123.45.67.89
site2.example.com       → A  123.45.67.89
site3.example.com       → A  123.45.67.89
... (67 more)
```

App servers are NOT publicly accessible (private IPs only).

---

## Step 3: Setup App Servers (Both Server 1 & 2)

SSH into each app server and run:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt update
sudo apt install -y nginx

# Clone repo
cd /var/www
git clone <your-repo-url> barangay
cd barangay

# Install dependencies
pnpm install

# Build all sites
pnpm build:all  # Or: cd sites/banadero && pnpm build (repeat for each)

# Copy app server nginx config
sudo cp deployment/nginx/appserver.conf /etc/nginx/sites-available/default
sudo systemctl reload nginx

# Generate and start PM2 processes
node deployment/generate-pm2-config.js
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable auto-start

# Create logs directory
mkdir -p logs
```

Verify it's working:
```bash
curl http://localhost:3001  # Should return banadero homepage
curl http://localhost:3002  # Should return site2 homepage (if exists)
```

---

## Step 4: Setup Load Balancer

SSH into the load balancer:

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Copy load balancer config
# (First, upload deployment/nginx/loadbalancer.conf to server)
sudo cp loadbalancer.conf /etc/nginx/sites-available/default

# Edit and update app server IPs
sudo nano /etc/nginx/sites-available/default
# Change:
#   server 10.0.1.10:80;  # App Server 1 private IP
#   server 10.0.1.11:80;  # App Server 2 private IP

# Test config
sudo nginx -t

# Get SSL certificates for all domains
sudo certbot --nginx -d banaderolegazpi.online -d www.banaderolegazpi.online

# For multiple domains, run certbot multiple times or use:
# sudo certbot --nginx -d domain1.com -d www.domain1.com -d domain2.com -d www.domain2.com ...

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 5: Test Load Balancing

```bash
# From your local machine:
curl https://banaderolegazpi.online

# Check which app server handled it:
# Server 1: curl http://10.0.1.10/health
# Server 2: curl http://10.0.1.11/health
```

Test failover:
```bash
# SSH to App Server 1
pm2 stop all

# Website should still work (Server 2 handles traffic)

# Restart Server 1
pm2 start all
```

---

## Step 6: Deploy New Sites

### On App Servers (both):
```bash
cd /var/www/barangay
git pull
pnpm install

# Build new site
cd sites/newsite
pnpm build
cd ../..

# Regenerate PM2 config
node deployment/generate-pm2-config.js
pm2 reload deployment/ecosystem.config.js

# Regenerate Nginx config
node deployment/generate-nginx-config.js
sudo cp deployment/nginx/barangay-sites.conf /etc/nginx/sites-available/default
sudo systemctl reload nginx
```

### On Load Balancer:
```bash
# Update SSL cert for new domain
sudo certbot --nginx -d newsite.example.com -d www.newsite.example.com
```

---

## Monitoring

### Check PM2 processes:
```bash
pm2 list
pm2 monit
pm2 logs banadero
```

### Check Nginx logs:
```bash
# App servers
sudo tail -f /var/log/nginx/access.log

# Load balancer
sudo tail -f /var/log/nginx/access.log
```

### Check which server is handling requests:
```bash
# Add this to app server nginx config to log server ID:
add_header X-Served-By "App-Server-1" always;  # or App-Server-2
```

---

## Scaling to More Servers

Add App Server 3:

1. Provision new VPS with private IP `10.0.1.12`
2. Setup same as App Server 1 & 2
3. Update load balancer config:
   ```nginx
   upstream app_servers {
       server 10.0.1.10:80;
       server 10.0.1.11:80;
       server 10.0.1.12:80;  # New server
   }
   ```
4. `sudo systemctl reload nginx` on load balancer

Traffic now splits 33/33/33 across 3 servers.

---

## Advanced: Health Checks & Weights

```nginx
upstream app_servers {
    # Give Server 1 more traffic (2x)
    server 10.0.1.10:80 weight=2;
    server 10.0.1.11:80 weight=1;

    # Automatically remove failed servers
    server 10.0.1.12:80 max_fails=3 fail_timeout=30s;

    # Connection pooling
    keepalive 64;
}
```

---

## Troubleshooting

**Site not loading:**
```bash
# Check Nginx on load balancer
sudo nginx -t
sudo systemctl status nginx

# Check Nginx on app server
curl http://localhost:3001

# Check PM2
pm2 list
pm2 logs banadero --lines 50
```

**SSL issues:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

**One server down:**
Load balancer automatically routes to healthy server. Fix and restart the down server.
