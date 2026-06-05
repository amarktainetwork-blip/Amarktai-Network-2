# Final VPS Setup

## Base packages

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib redis-server ffmpeg python3 python3-venv python3-pip build-essential
corepack enable
```

Install Node.js 20 LTS or newer.

## Application and browser runtime

```bash
sudo mkdir -p /var/www/amarktai
sudo chown -R "$USER":"$USER" /var/www/amarktai
git clone <REPOSITORY_URL> /var/www/amarktai/network
cd /var/www/amarktai/network
npm ci
npx playwright install --with-deps chromium
```

## Local crawler

```bash
cd /var/www/amarktai/network
python3 -m venv .venv-crawler
source .venv-crawler/bin/activate
pip install -r services/crawler/requirements.txt
python -m playwright install chromium
deactivate
```

## PostgreSQL, Redis, and Qdrant

```bash
sudo -u postgres createuser --pwprompt amarktai
sudo -u postgres createdb --owner=amarktai amarktai
sudo systemctl enable --now postgresql redis-server
docker run -d --name qdrant --restart unless-stopped -p 6333:6333 -p 6334:6334 -v /var/lib/qdrant:/qdrant/storage qdrant/qdrant:latest
```

## Storage

```bash
sudo mkdir -p /var/www/amarktai/storage/{artifacts,uploads,repos,workspaces,logs,memory,jobs,research}
sudo chown -R www-data:www-data /var/www/amarktai/storage
sudo chmod -R 750 /var/www/amarktai/storage
```

## Environment, database, and build

```bash
cd /var/www/amarktai/network
cp .env.example .env
nano .env
npx prisma generate
npx prisma db push
npm run build
```

Required live configuration: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `COOKIE_SECURE`, `GENX_API_KEY`, a GenX URL, `GITHUB_PAT`, `REDIS_URL`, `QDRANT_URL`, and writable storage.

## systemd

```ini
[Unit]
Description=Amarktai Network
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/amarktai/network
EnvironmentFile=/var/www/amarktai/network/.env
Environment=PATH=/var/www/amarktai/network/.venv-crawler/bin:/usr/local/bin:/usr/bin
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save as `/etc/systemd/system/amarktai-network.service`, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now amarktai-network
sudo systemctl status amarktai-network --no-pager
```

## Nginx HTTP first

```nginx
server {
    listen 80;
    server_name amarktai.co.za www.amarktai.co.za;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://amarktai.co.za
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d amarktai.co.za -d www.amarktai.co.za
```

Install Rhubarb Lip Sync at `/usr/local/bin/rhubarb` and verify with `rhubarb --version`. OpenVoice, SadTalker, and LivePortrait remain optional GPU experiments.
