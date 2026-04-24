#!/bin/bash
# deploy.sh — Run this on the production server after every git push
# Usage: bash /var/www/boms/deploy.sh

set -e
cd /var/www/boms

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Installing dependencies..."
npm install --legacy-peer-deps

echo "▶ Building..."
npm run build

echo "▶ Copying static assets..."
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

echo "▶ Restarting PM2..."
pm2 restart boms

echo "✅ Deploy complete! Commit: $(git log --oneline -1)"
