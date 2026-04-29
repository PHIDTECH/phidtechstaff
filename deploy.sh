#!/bin/bash
# deploy.sh — Run this on the production server after every git push
# Usage: bash /var/www/boms/deploy.sh

set -e
cd /var/www/boms

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Installing dependencies..."
npm install --legacy-peer-deps

echo "▶ Clearing Next.js build cache + old compiled output..."
rm -rf .next/cache
# Remove old standalone to ensure stale JS bundles are fully replaced
rm -rf .next/standalone

echo "▶ Building (fresh)..."
npm run build

echo "▶ Copying static assets..."
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public

echo "▶ Restarting PM2 (zero-downtime reload)..."
if pm2 describe boms > /dev/null 2>&1; then
  pm2 reload boms --update-env
else
  pm2 start /var/www/boms/.next/standalone/server.js --name boms
fi
pm2 save

# Wait until the app responds before declaring success
echo "▶ Waiting for app to come online..."
for i in $(seq 1 15); do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ] || [ "$HTTP" = "307" ] || [ "$HTTP" = "302" ]; then
    echo "   App is up (HTTP $HTTP)"
    break
  fi
  echo "   Attempt $i: HTTP $HTTP — waiting..."
  sleep 2
done

echo ""
echo "✅ Deploy complete! Commit: $(git log --oneline -1)"
echo "   Server time: $(date)"
echo "   Verify: https://phidtechstaff.co.tz"
