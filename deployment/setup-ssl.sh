#!/bin/bash

# SSL Certificate Setup Script for Banadero Website
# This script sets up Let's Encrypt SSL certificates

echo "🔒 Setting up SSL certificates for banaderolegazpi.online..."

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install certbot and nginx plugin
echo "🔧 Installing certbot and nginx plugin..."
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
echo "⏸️ Stopping nginx temporarily..."
systemctl stop nginx

# Obtain SSL certificate
echo "🎫 Obtaining SSL certificate from Let's Encrypt..."
certbot certonly --standalone -d banaderolegazpi.online -d www.banaderolegazpi.online --non-interactive --agree-tos --email brgy6banadero@gmail.com

# Check if certificate was created successfully
if [ -f "/etc/letsencrypt/live/banaderolegazpi.online/fullchain.pem" ]; then
    echo "✅ SSL certificate created successfully!"
    
    # Set up automatic renewal
    echo "🔄 Setting up automatic certificate renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    # Copy HTTPS configuration
    echo "📋 Installing HTTPS nginx configuration..."
    cp /root/barangay-website/nginx-https.conf /etc/nginx/sites-available/barangay-website
    
    # Start nginx with new configuration
    echo "🚀 Starting nginx with HTTPS configuration..."
    systemctl start nginx
    systemctl enable nginx
    
    # Test nginx configuration
    echo "🧪 Testing nginx configuration..."
    nginx -t
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx configuration is valid!"
        echo "🌐 Your website is now available at: https://banaderolegazpi.online"
        echo "🔒 All HTTP traffic will be redirected to HTTPS"
    else
        echo "❌ Nginx configuration test failed!"
        exit 1
    fi
else
    echo "❌ SSL certificate creation failed!"
    echo "Please check your domain DNS settings and try again."
    exit 1
fi

echo "🎉 SSL setup completed successfully!"
echo "📋 Next steps:"
echo "   1. Test your website at https://banaderolegazpi.online"
echo "   2. Verify HTTPS redirect is working"
echo "   3. Check SSL certificate validity"
