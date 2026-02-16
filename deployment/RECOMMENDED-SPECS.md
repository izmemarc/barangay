# Recommended Server Specs for 70 Barangay Sites

## Full Redundancy Setup ($268/month)

### Infrastructure Overview
- **2 Load Balancers** (active-standby with floating IP)
- **3 Application Servers** (N+1 redundancy, any 1 can fail)
- **Cloudflare** (DNS failover + CDN + DDoS protection)
- **Supabase Pro** (database with backups + point-in-time recovery)

---

## Server Specifications

### Load Balancer 1 & 2 (Floating IP Pair)
```
Provider:   DigitalOcean / Hetzner
RAM:        4GB
CPU:        2 cores
Storage:    50GB SSD
Bandwidth:  4TB/month
OS:         Ubuntu 24.04 LTS
Cost:       $24/month each ($48 total)

Software:
- Nginx (load balancer)
- Keepalived (floating IP failover)
- Certbot (SSL)
```

**Setup:**
- Use DigitalOcean Floating IP or Hetzner Floating IP
- LB1 is primary (holds floating IP)
- LB2 is standby (takes over if LB1 fails)
- Failover time: ~30 seconds

---

### App Server 1, 2 & 3 (Application Cluster)
```
Provider:   Hetzner (best price/performance)
RAM:        32GB
CPU:        8 cores (AMD Ryzen or Intel)
Storage:    200GB NVMe SSD
Bandwidth:  5TB/month (20 Gbit/s)
OS:         Ubuntu 24.04 LTS
Cost:       $65/month each ($195 total)

Software:
- Node.js 20
- pnpm
- PM2 (runs 70 Next.js processes)
- Nginx (local reverse proxy)
```

**Traffic Distribution:**
- Normal: 33% / 33% / 33%
- If 1 server down: 50% / 50%
- If 2 servers down: 100% on remaining (degraded but functional)

**PM2 per server:**
- 70 sites × 2 instances each = 140 PM2 processes
- ~150MB RAM per site = ~10.5GB RAM used
- Leaves ~20GB for OS, caching, spikes

---

### Database (Supabase Pro)
```
Provider:   Supabase
Plan:       Pro
Storage:    8GB database + 100GB file storage
Features:
- Automatic daily backups
- Point-in-time recovery (7 days)
- 99.9% uptime SLA
- No connection limits
- Email support

Cost:       $25/month
```

**Upgrade to Team ($599/month) if you need:**
- Multi-region replication
- Dedicated compute (no noisy neighbors)
- 99.95% uptime SLA
- Priority support

---

### DNS & CDN (Cloudflare)
```
Plan:       Free or Pro
Features:
- DNS with health check failover
- DDoS protection (unlimited on Pro)
- CDN for static assets
- SSL/TLS termination
- Web Application Firewall (Pro)

Cost:       $0 (Free) or $20/month (Pro)
```

---

## Capacity Planning

### Traffic Handling
With 3 app servers (32GB RAM, 8 CPU each):

**Per server capacity:**
- ~2,000 concurrent connections
- ~50,000 requests/hour
- ~1.2M requests/day

**Total cluster capacity (3 servers):**
- ~6,000 concurrent connections
- ~150,000 requests/hour
- ~3.6M requests/day

**Per barangay site (70 sites):**
- ~85 concurrent users per site
- ~2,100 requests/hour per site
- ~51,000 requests/day per site

This is **more than enough** for typical barangay website traffic.

---

## Growth Scaling Path

### Phase 1: Start (1-10 sites)
- 1 Load Balancer: $24/month
- 2 App Servers: $130/month
- Supabase Free: $0
- **Total: $154/month**

### Phase 2: Growth (10-40 sites)
- 2 Load Balancers: $48/month
- 3 App Servers: $195/month
- Supabase Pro: $25/month
- **Total: $268/month**

### Phase 3: Scale (40-70 sites) ← Current recommendation
- 2 Load Balancers: $48/month
- 3 App Servers: $195/month
- Supabase Pro: $25/month
- **Total: $268/month**

### Phase 4: Enterprise (70+ sites, high traffic)
- 2 Load Balancers: $48/month
- 4 App Servers: $260/month
- Supabase Team: $599/month
- **Total: $907/month**

---

## Failover Scenarios

### Scenario 1: One App Server Fails
```
Before:  Server1 (33%) | Server2 (33%) | Server3 (33%)
After:   Server1 (50%) | Server2 (50%) | Server3 (DOWN)
Impact:  None - automatic failover in 5 seconds
```

### Scenario 2: Load Balancer Fails
```
Before:  LB1 (Active) | LB2 (Standby)
After:   LB1 (DOWN)   | LB2 (Active - takes floating IP)
Impact:  ~30 second downtime during failover
```

### Scenario 3: Two App Servers Fail
```
Before:  Server1 (33%) | Server2 (33%) | Server3 (33%)
After:   Server1 (100%) | Server2 (DOWN) | Server3 (DOWN)
Impact:  Degraded performance but functional
Action:  Alert team, restart failed servers
```

### Scenario 4: Database Connection Lost
```
Before:  App Servers → Supabase
After:   App Servers → (no connection)
Impact:  Supabase has 99.9% SLA, rare outage
Action:  Built-in reconnection logic in Supabase client
```

---

## Monitoring & Alerts

### Required Monitoring
1. **UptimeRobot** ($0-7/month)
   - Ping all 70 domains every 5 minutes
   - Alert if any site is down

2. **PM2 Plus** (optional, $0-49/month)
   - Real-time process monitoring
   - Memory/CPU alerts
   - Automatic restarts

3. **Server Monitoring**
   - Free: `htop`, `pm2 monit`, Nginx logs
   - Paid: Datadog ($15/month), New Relic ($25/month)

### Alert Thresholds
```
CPU > 80% for 5 minutes  → Warning
RAM > 90%                → Warning
Disk > 85%               → Warning
Any site down            → Critical (SMS alert)
Load balancer down       → Critical (SMS alert)
```

---

## Backup Strategy

### Application Servers
- **Git repo:** Push all code changes
- **PM2 config:** Auto-generated from database
- **Nginx config:** Auto-generated from database
- **Recovery time:** ~30 minutes to rebuild a server

### Database (Supabase)
- **Daily automated backups** (included in Pro)
- **Point-in-time recovery** (7 days on Pro, 30 days on Team)
- **Manual snapshots** before major migrations
- **Recovery time:** ~10 minutes

### Files (Supabase Storage)
- **Redundancy:** Built-in (stored on AWS S3)
- **Backups:** Use `gsutil` or `rclone` to backup to separate bucket
- **Frequency:** Weekly backups of `extracted_images` bucket

---

## Cost Optimization Tips

### 1. Use Reserved Instances (20-40% savings)
- Hetzner: No reservations, but cheapest already
- DigitalOcean: Save 17% with annual billing
- AWS/GCP: 30-40% off with 1-year commit

### 2. Start Small, Scale Up
- Begin with 2 app servers ($130/month)
- Add 3rd server when traffic grows
- Saves $65/month in early days

### 3. Use Cloudflare Free Tier
- Free CDN + DDoS protection
- Only upgrade to Pro ($20) if you need WAF or advanced rules

### 4. Self-host Monitoring
- Use free tools: `pm2 monit`, `htop`, `nginx logs`
- Delay paid monitoring until revenue justifies it

---

## Summary Recommendation

**For 70 barangay sites with full redundancy:**

✅ **3 App Servers** (Hetzner, 32GB RAM, 8 CPU) = $195/month
✅ **2 Load Balancers** (DigitalOcean, 4GB RAM) = $48/month
✅ **Supabase Pro** (database + storage) = $25/month
✅ **Cloudflare Free** (DNS + CDN) = $0/month

**Total: $268/month**

**Uptime:** 99.95% (~21 minutes/month downtime)
**Redundancy:** N+1 (any 1 server can fail)
**Capacity:** 3.6M requests/day total
**Traffic per site:** ~50k requests/day per barangay

This setup can handle **10x traffic growth** before needing more servers.
