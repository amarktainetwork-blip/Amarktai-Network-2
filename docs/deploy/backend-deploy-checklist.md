# Backend Deploy Checklist

Use this checklist before restarting the VPS service.

1. Install and start MariaDB:
   `apt-get update && apt-get install -y mariadb-server`
   `systemctl enable --now mariadb`

2. Create the production database and least-privilege application user:
   `sudo mariadb`

   ```sql
   CREATE DATABASE amarktai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'amarktai_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_A_REAL_RANDOM_PASSWORD';
   GRANT ALL PRIVILEGES ON amarktai.* TO 'amarktai_app'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

3. Set a real URL in `/var/www/amarktai/platform/.env`. The required format is:
   `DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/amarktai"`

   Replace `USER` and `PASSWORD`; do not deploy the template literally.

4. Prepare persistent local storage:
   `install -d -o www-data -g www-data -m 0750 /var/www/amarktai/storage/{artifacts,uploads,repos,workspaces,logs}`

   Set:
   `STORAGE_DRIVER="local_vps"`
   `AMARKTAI_STORAGE_ROOT="/var/www/amarktai/storage"`

   Keep the VPS layout:
   `/var/www/amarktai/platform`
   `/var/www/amarktai/apps/<app-slug>`
   `/var/www/amarktai/storage`
   `/var/www/amarktai/logs`
   `/var/www/amarktai/backups`

5. Confirm the target branch and commit:
   `git status --short --branch`
   `git rev-parse HEAD`

6. Install dependencies:
   `npm ci`

7. Generate and validate the MariaDB Prisma client:
   `npm exec -- prisma generate`
   `npm exec -- prisma validate`

8. Apply the schema:
   `npm exec -- prisma db push`

9. Verify the database and storage before building:
   `printf 'SELECT 1;' | npm exec -- prisma db execute --stdin`
   `sudo -u www-data test -w /var/www/amarktai/storage/artifacts`

10. Run repository proof:
   `npx tsc --noEmit`
   `npm test`
   `npm run build`

11. Confirm systemd service is canonical:
   `systemctl status amarktai-web`

12. Restart and verify:
   `systemctl restart amarktai-web`
   `curl -sf --max-time 10 http://localhost:3000/api/health/ping`

Do not mark media, repo, or AI routes live-ready unless their status endpoints report real providers available or a truthful blocker.
