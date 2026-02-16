# Community Chat (Single VPS Docker Compose Deployment)

This project is refactored for a low-cost single-server deployment. It runs on one VM with three containers:
- `web`: Next.js + API
- `db`: PostgreSQL 15
- `caddy`: reverse proxy with automatic HTTPS via Let's Encrypt

Profile image uploads are stored on local disk in Docker volumes and served by the app at `/uploads/profile-images/<filename>`.
Chat media uploads (images/GIFs) are stored in the same volume and served by authenticated API endpoints.

## Runtime Architecture
- No AWS ECS/Fargate, RDS, S3, or load balancer dependencies
- Docker Compose orchestrates all services
- Postgres data and uploaded images persist in Docker named volumes
- TLS certificates persist in Caddy volumes
- Secrets come from `.env` values injected into containers

## Environment
Copy `.env.example` to `.env` and set secure values:

```bash
cp .env.example .env
```

Required keys:
- `NODE_ENV=production`
- `APP_DOMAIN`
- `DATABASE_URL` (default: `postgresql://postgres:postgres@db:5432/app`)
- `SHARED_PASSWORD`
- `SESSION_SECRET`
- `ADMIN_IDENTIFIERS` (comma-separated usernames/emails promoted to `ADMIN` role during seed)
- `SEED_USERS` (users created/updated by `npm run db:seed`)
- `UPLOAD_BASE_DIR` (default `/data/uploads`)
- `MAX_PROFILE_IMAGE_BYTES` (default `2097152`)
- `MAX_CHAT_MEDIA_BYTES` (default `20971520`)
- `GIPHY_API_KEY` (optional beta key; enables GIF search/import)
- `GIPHY_SEARCH_LIMIT` (default `12`, max `25`)
- `GIPHY_SEARCH_CACHE_TTL_MS` (default `180000`)

## Authentication Model
- Only existing users can sign in.
- New accounts are created only by admins at `/app/admin`.
- Admin accounts use the `ADMIN` role, can view all conversations, but cannot be conversation participants.
- At least one admin account must exist in the database (seed handles this).
- Seed users can come from `.env` via `SEED_USERS`.
- Compact format: `username|email|displayName|role;username2|email2|displayName2|role2`
- JSON format is also supported: `[{"username":"alice","email":"alice@example.com","displayName":"Alice","role":"ADMIN"}]`

## Lightsail Deployment (Fresh VM to Live HTTPS)

### 1. Provision VM
1. Create an **AWS Lightsail Ubuntu** instance (`$5` plan is enough for small workloads).
2. Attach a **Static IP** in Lightsail and bind it to the instance.
3. Ensure firewall allows inbound `80` and `443`.

### 2. Install Docker + Compose Plugin

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git
sudo usermod -aG docker $USER
newgrp docker
```

### 3. Deploy App

```bash
git clone <your-repo-url>
cd Social\ Network
cp .env.example .env
```

Edit `.env`:
- Set `APP_DOMAIN` to your real domain (for example `chat.example.com`)
- Set strong values for `SHARED_PASSWORD` and `SESSION_SECRET`

Start production stack:

```bash
docker compose up -d --build
```

The web container automatically:
1. Waits for Postgres
2. Runs `prisma migrate deploy`
3. Starts Next.js on port `3000`

### 4. Enable HTTPS
1. Create a DNS `A` record for your domain pointing to the Lightsail static IP.
2. Wait for DNS propagation.
3. Caddy will automatically request and renew Let's Encrypt certificates once the domain resolves.

Check status:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f web
```

### 5. Backups
Enable **automatic Lightsail snapshots**. This protects:
- PostgreSQL data (`postgres_data` volume)
- Uploaded profile/chat media (`uploads_data` volume)
- Caddy TLS state (`caddy_data` volume)

## Local Operations
```bash
docker compose up -d --build
docker compose logs -f web
docker compose exec web npm run db:seed
docker compose down
```

## Reliability and Safety Features
- DB readiness retries before app startup
- Automatic migration on boot (`prisma migrate deploy`)
- API health endpoint (`/api/health`) for container health checks
- Basic IP-based API rate limiting middleware
- File upload type/size checks (profile image default: 2 MB, chat media default: 20 MB)
- Debounced and cached GIPHY search to reduce external API calls
- Graceful shutdown signal handling in container startup script
- Structured logging to stdout/stderr for Docker log collection
