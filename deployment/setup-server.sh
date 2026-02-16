#!/bin/bash
# One-time server setup for GitHub Actions deployment
# Run this manually on the server: bash setup-server.sh
set -e

DEPLOY_DIR="/opt/barangay"

echo "=== Barangay Server Setup ==="

# 1. Create directory structure
echo "Creating directory structure..."
mkdir -p $DEPLOY_DIR/{sites,deployment}

# 2. Install Node.js (if not present)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node: $(node -v)"

# 3. Install PM2 (if not present)
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
    pm2 startup
fi
echo "PM2: $(pm2 -v)"

# 4. Set up SSH key for GitHub Actions
echo ""
echo "--- SSH Key Setup ---"
mkdir -p ~/.ssh
chmod 700 ~/.ssh

if [ ! -f ~/.ssh/authorized_keys ]; then
    touch ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

echo ""
echo "To set up GitHub Actions deployment:"
echo "  1. Generate a key pair on your local machine:"
echo "     ssh-keygen -t ed25519 -C \"github-actions-deploy\" -f deploy_key"
echo ""
echo "  2. Copy the PUBLIC key to this server:"
echo "     cat deploy_key.pub >> ~/.ssh/authorized_keys"
echo ""
echo "  3. Add these GitHub secrets (repo -> Settings -> Secrets -> Actions):"
echo "     - SSH_PRIVATE_KEY          = contents of deploy_key"
echo "     - SERVER_HOST              = $(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
echo "     - SERVER_USER              = $(whoami)"
echo "     - NEXT_PUBLIC_SUPABASE_URL = your-supabase-url"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY = your-supabase-anon-key"
echo "     - SUPABASE_SERVICE_ROLE_KEY     = your-service-role-key"
echo "     - GOOGLE_SERVICE_ACCOUNT_KEY    = your-base64-service-account-json"
echo "     - GOOGLE_CLIENT_ID              = your-google-client-id"
echo "     - GOOGLE_CLIENT_SECRET          = your-google-client-secret"
echo "     - PHILSMS_API_TOKEN             = your-philsms-token"
echo "     - PHILSMS_SENDER_ID             = PhilSMS"
echo ""
echo "  Site-specific config (template IDs, folder IDs, etc.) lives in"
echo "  sites/<site>/site.config.json in the repo. No .env.local needed per site."
echo ""
echo "=== Setup complete ==="
echo "Deploy from GitHub Actions:"
echo "  Actions -> Deploy Site -> Run workflow -> select site"
