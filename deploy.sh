#!/bin/bash
# deploy.sh — Run this on the production server after every git push
# Usage: bash /var/www/boms/deploy.sh

set -e
cd /var/www/boms

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Installing dependencies..."
npm install --legacy-peer-deps

echo "▶ Clearing Next.js build cache..."
rm -rf .next/cache

echo "▶ Building (fresh)..."
npm run build

echo "▶ Copying static assets..."
rm -rf .next/standalone/.next/static
rm -rf .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

echo "▶ Restarting PM2..."
pm2 restart boms --update-env

echo "✅ Deploy complete! Commit: $(git log --oneline -1)"
echo "   Server time: $(date)"
