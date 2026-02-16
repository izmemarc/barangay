#!/bin/bash
# One-time server setup for GitHub Actions deployment
# Run this manually on the server: bash setup-server.sh
set -e

DEPLOY_DIR="/opt/barangay"

echo "=== Barangay Server Setup ==="

# 1. Create directory structure
echo "Creating directory structure..."
mkdir -p $DEPLOY_DIR/sites/banadero/{release,logs}
mkdir -p $DEPLOY_DIR/deployment

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
echo "  3. Add the PRIVATE key as a GitHub secret:"
echo "     - Go to your repo -> Settings -> Secrets and variables -> Actions"
echo "     - Add secret: SSH_PRIVATE_KEY = contents of deploy_key"
echo "     - Add secret: SERVER_HOST = $(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
echo "     - Add secret: SERVER_USER = $(whoami)"
echo "     - Add secret: NEXT_PUBLIC_SUPABASE_URL = your-supabase-url"
echo "     - Add secret: NEXT_PUBLIC_SUPABASE_ANON_KEY = your-supabase-anon-key"
echo ""

# 5. Reminder about .env.local
echo "--- Environment Variables ---"
echo "Place .env.local files for each site:"
echo "  $DEPLOY_DIR/sites/banadero/.env.local"
echo ""

if [ -f "$DEPLOY_DIR/sites/banadero/.env.local" ]; then
    echo "  banadero: .env.local EXISTS"
else
    echo "  banadero: .env.local MISSING — copy it before deploying!"
fi

# 6. Migrate from old structure (if exists)
if [ -d "/root/barangay-monorepo/sites/banadero" ] && [ -f "/root/barangay-monorepo/sites/banadero/.env.local" ]; then
    echo ""
    echo "--- Found old deployment at /root/barangay-monorepo ---"
    if [ ! -f "$DEPLOY_DIR/sites/banadero/.env.local" ]; then
        cp /root/barangay-monorepo/sites/banadero/.env.local $DEPLOY_DIR/sites/banadero/.env.local
        echo "  Copied .env.local from old deployment"
    fi
fi

echo ""
echo "=== Setup complete ==="
echo "Once secrets are configured, deploy from GitHub Actions:"
echo "  Actions -> Deploy Site -> Run workflow -> select site"
