// Generate Nginx domain->port mapping from Supabase barangays table
// Run: node deployment/generate-nginx-config.js

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function generateNginxConfig() {
  // Read Supabase credentials from root .env.local or sites/banadero/.env.local
  const envPath = path.join(__dirname, '../sites/banadero/.env.local')
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) env[key.trim()] = value.trim()
  })

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Fetch all active barangays
  const { data: barangays, error } = await supabase
    .from('barangays')
    .select('slug, domain')
    .eq('is_active', true)
    .order('slug')

  if (error) {
    console.error('❌ Error fetching barangays:', error)
    process.exit(1)
  }

  if (!barangays || barangays.length === 0) {
    console.error('❌ No active barangays found in database')
    process.exit(1)
  }

  // Generate map block
  let mapBlock = `# Map domain to backend port\nmap $host $backend_port {\n`
  mapBlock += `    default                     3001;  # Fallback\n\n`

  barangays.forEach((brgy, index) => {
    const port = 3001 + index
    mapBlock += `    # ${brgy.slug}\n`
    mapBlock += `    ${brgy.domain.padEnd(30)} ${port};\n`
    mapBlock += `    www.${brgy.domain.padEnd(26)} ${port};\n\n`
  })

  mapBlock += `}`

  // Full Nginx config
  const nginxConfig = `# Nginx load balancer for ${barangays.length} barangay sites
# AUTO-GENERATED - Do not edit manually
# Generated: ${new Date().toISOString()}

${mapBlock}

# HTTP -> HTTPS redirect
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;

    # SSL certificates (use certbot with multiple domains)
    ssl_certificate /etc/letsencrypt/live/${barangays[0].domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${barangays[0].domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js app on mapped port
    location / {
        proxy_pass http://127.0.0.1:$backend_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase max body size for file uploads
    client_max_body_size 10M;
}
`

  // Write to file
  const outputPath = path.join(__dirname, 'nginx/barangay-sites.conf')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, nginxConfig)

  console.log(`✅ Generated Nginx config for ${barangays.length} sites:`)
  barangays.forEach((brgy, index) => {
    console.log(`   ${brgy.slug.padEnd(20)} ${brgy.domain.padEnd(30)} → port ${3001 + index}`)
  })
  console.log(`\n📝 Config written to: ${outputPath}`)
  console.log(`\n🚀 Next steps:`)
  console.log(`   1. Copy to server: scp ${outputPath} user@server:/etc/nginx/sites-available/`)
  console.log(`   2. Enable: sudo ln -s /etc/nginx/sites-available/barangay-sites.conf /etc/nginx/sites-enabled/`)
  console.log(`   3. Test: sudo nginx -t`)
  console.log(`   4. Reload: sudo systemctl reload nginx`)
}

generateNginxConfig().catch(console.error)
