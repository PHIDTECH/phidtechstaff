#!/bin/bash
# deploy.sh — Run this on the production server after every git push
# Usage: bash /var/www/boms/deploy.sh

set -e
# Print every command as it runs so you can see exactly where a failure happens
set -x

# Trap any error and print a helpful message
trap 'echo ""; echo "❌ DEPLOY FAILED at line $LINENO — check the error above"; exit 1' ERR

cd /var/www/boms

echo "▶ Force-syncing code from GitHub (discards any server-side local changes)..."
git fetch origin
git reset --hard origin/main
git clean -fd

echo "▶ Installing dependencies..."
npm install --legacy-peer-deps

echo "▶ Clearing Next.js build cache + old compiled output..."
rm -rf .next/cache
rm -rf .next/standalone

echo "▶ Building (fresh)..."
# Increase Node.js heap to 1.5 GB to prevent out-of-memory build failures
NODE_OPTIONS="--max-old-space-size=1536" npm run build

echo "▶ Copying static assets..."
cp -r .next/static  .next/standalone/.next/static
cp -r public        .next/standalone/public

echo "▶ Restarting PM2 using ecosystem config (PORT=3002 always set)..."
if pm2 describe boms > /dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
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
