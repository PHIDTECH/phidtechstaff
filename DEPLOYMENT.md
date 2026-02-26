# BOMS – DigitalOcean Deployment Guide

## Overview

This guide covers deploying BOMS on a **DigitalOcean Droplet** using Docker + Nginx + Let's Encrypt SSL.

---

## Recommended Droplet Spec

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPUs |
| RAM | 1 GB | 2 GB |
| Storage | 25 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

> Use the **$12/mo Basic Droplet** (2 vCPU / 2 GB RAM) for a smooth experience.

---

## Step 1 – Create and Configure Your Droplet

### 1.1 Create the Droplet
1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Create Droplet → Ubuntu 22.04 → Basic plan
3. Enable **SSH key authentication**
4. (Optional) Enable **DigitalOcean Managed Firewall** – allow ports 22, 80, 443

### 1.2 Point Your Domain
In your domain registrar or DigitalOcean DNS, add:
```
A    @       <your-droplet-ip>
A    www     <your-droplet-ip>
```

---

## Step 2 – Server Setup

SSH into your droplet:
```bash
ssh root@<your-droplet-ip>
```

### 2.1 Update the system
```bash
apt update && apt upgrade -y
```

### 2.2 Install Docker
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```

### 2.3 Install Docker Compose
```bash
apt install -y docker-compose-plugin
docker compose version   # verify
```

### 2.4 Install Certbot (SSL)
```bash
apt install -y certbot
```

### 2.5 Create app user (optional but recommended)
```bash
adduser boms
usermod -aG docker boms
su - boms
```

---

## Step 3 – Deploy the Application

### 3.1 Clone or upload the project
```bash
# Option A: Clone from Git
git clone https://github.com/your-org/boms.git /var/www/boms
cd /var/www/boms

# Option B: Upload from local machine (run from your local terminal)
# scp -r ./boms root@<your-droplet-ip>:/var/www/boms
```

### 3.2 Create environment file
```bash
cd /var/www/boms
cp env.example .env.production
nano .env.production
```

Set at minimum:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_TELEMETRY_DISABLED=1
```

### 3.3 Obtain SSL certificate (before starting Nginx)
```bash
# Temporarily serve on port 80 to get the cert
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com \
  --non-interactive --agree-tos --email admin@yourdomain.com
```

### 3.4 Copy SSL certs to nginx/ssl
```bash
mkdir -p /var/www/boms/nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /var/www/boms/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /var/www/boms/nginx/ssl/
```

### 3.5 Update nginx.conf with your domain
```bash
nano /var/www/boms/nginx/nginx.conf
# Replace 'yourdomain.com' with your actual domain name
```

### 3.6 Build and start containers
```bash
cd /var/www/boms
docker compose up -d --build
```

### 3.7 Verify containers are running
```bash
docker compose ps
docker compose logs -f boms   # watch Next.js logs
```

---

## Step 4 – Verify Deployment

```bash
# Check app responds
curl -I http://localhost:3000

# Check Nginx proxy
curl -I https://yourdomain.com
```

Open `https://yourdomain.com` in your browser.  
Login with: `admin@phidtech.co.tz` / `admin123`

---

## Step 5 – Firewall (ufw)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

---

## Ongoing Operations

### Redeploy after code changes
```bash
cd /var/www/boms
git pull
docker compose up -d --build
```

### View logs
```bash
docker compose logs -f boms       # app logs
docker compose logs -f nginx      # nginx logs
```

### Restart services
```bash
docker compose restart boms
docker compose restart nginx
```

### Stop all services
```bash
docker compose down
```

### SSL Certificate Renewal (auto-renew via cron)
```bash
crontab -e
# Add this line:
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /var/www/boms/nginx/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /var/www/boms/nginx/ssl/ && docker compose -f /var/www/boms/docker-compose.yml restart nginx
```

---

## DigitalOcean App Platform Alternative (Simpler)

If you prefer **no Docker management**, use DigitalOcean App Platform:

1. Push code to GitHub
2. Go to DigitalOcean → **App Platform** → New App → GitHub
3. Select repo → Set **Build Command**: `npm run build`
4. Set **Run Command**: `npm start`
5. Set environment variables in the App Platform UI
6. Deploy

> App Platform handles SSL, scaling, and zero-downtime deploys automatically.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `NEXT_PUBLIC_APP_URL` | Yes | Your full domain URL |
| `NEXT_TELEMETRY_DISABLED` | Yes | Set to `1` |
| `DATABASE_URL` | Future | PostgreSQL connection string |
| `JWT_SECRET` | Future | Min 32-char secret for auth tokens |
| `SMTP_HOST` | Future | Email notifications SMTP host |
| `S3_ENDPOINT` | Future | DigitalOcean Spaces for file uploads |

---

---

## CI/CD – GitHub Actions Auto-Deploy

The workflow at `.github/workflows/deploy.yml` runs on every push to `main`:
1. **TypeScript check + Next.js build** — catches compile errors
2. **Docker image build + push** → GitHub Container Registry (ghcr.io)
3. **SSH deploy** → pulls latest image on your Droplet and restarts the container

### Required GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `DO_HOST` | Your Droplet IP address e.g. `134.122.10.50` |
| `DO_USER` | SSH user e.g. `root` or `boms` |
| `DO_SSH_KEY` | Contents of your **private** SSH key (`cat ~/.ssh/id_rsa`) |
| `DO_PORT` | SSH port, usually `22` (optional) |

> `GITHUB_TOKEN` is automatically provided by GitHub — no setup needed.

### Trigger a deploy manually
Go to your repo → **Actions** → **Build & Deploy to DigitalOcean** → **Run workflow**

---

## Project Structure

```
boms/
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
│   ├── layout/             # MainLayout, Sidebar, Header
│   ├── shared/             # StatCard, PageHeader
│   └── ui/                 # shadcn/ui primitives
├── lib/                    # utils.ts, types.ts, data.ts
├── public/                 # Static assets
├── nginx/
│   └── nginx.conf          # Nginx reverse proxy config
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose (app + nginx)
├── env.example             # Environment variable template
└── DEPLOYMENT.md           # This file
```
