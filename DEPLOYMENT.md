# 🌸 Karim & Nada — Wedding RSVP
## Complete Deployment Guide (Fly.io)

---

## 📁 Project Structure

```
wedding-rsvp/
├── server.js          ← Express backend + SQLite API
├── package.json
├── Dockerfile
├── fly.toml           ← Fly.io configuration
├── .dockerignore
├── .gitignore
└── public/
    ├── index.html     ← The full RSVP website
    └── couple.jpg     ← Your wedding photo
```

---

## 🗄️ Database: SQLite (Recommended for your use case)

### Why SQLite?
- **Zero setup** — no separate database server needed
- **Perfect for RSVP scale** — hundreds of responses, not millions
- **Free** — runs inside your app container
- **Persistent** on Fly.io via a mounted volume (`/data/rsvp.db`)

### The RSVP table schema:
```sql
CREATE TABLE rsvps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,  -- prevents duplicates
  attending   TEXT    CHECK(attending IN ('yes','no')),
  guests      INTEGER DEFAULT 1,
  message     TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Viewing responses (SSH into your Fly machine):
```bash
fly ssh console
sqlite3 /data/rsvp.db "SELECT name, attending, guests, created_at FROM rsvps;"
```

### Or use the admin API endpoint:
```bash
curl https://your-app.fly.dev/api/admin/rsvps \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

---

### Alternative Databases (if you need more):

| Option | When to use |
|--------|-------------|
| **SQLite** ✅ | Default — perfect for RSVPs |
| **PostgreSQL** (Fly Postgres) | If you want a web-based admin panel |
| **PlanetScale / Turso** | If you want a hosted cloud DB |
| **Supabase** | If you want a dashboard to see RSVPs visually |

---

## 🚀 Deploying to Fly.io — Step by Step

### Step 1 — Install Fly CLI
```bash
# macOS
brew install flyctl

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Linux
curl -L https://fly.io/install.sh | sh
```

### Step 2 — Sign up / Login
```bash
fly auth signup    # if new
# OR
fly auth login     # if existing account
```

### Step 3 — Create your app
```bash
cd wedding-rsvp
fly launch --no-deploy
```
- When asked for app name: type `karim-nada-wedding` (or anything you like)
- When asked for region: choose **jnb** (Johannesburg) — closest to Egypt
- Say **NO** to creating a Postgres database (we use SQLite)

### Step 4 — Create a persistent volume for the database
```bash
fly volumes create rsvp_data --size 1 --region jnb
```

### Step 5 — Set environment secrets
```bash
fly secrets set ADMIN_TOKEN=choose_a_secret_password_here
```

### Step 6 — Deploy! 🎉
```bash
fly deploy
```

### Step 7 — Open your site
```bash
fly open
# → https://karim-nada-wedding.fly.dev
```

---

## 🔑 Admin — View All RSVPs

After deploying, view all responses via:

```bash
curl https://karim-nada-wedding.fly.dev/api/admin/rsvps \
  -H "x-admin-token: your_secret_password"
```

Response:
```json
{
  "summary": {
    "total": 42,
    "attending": 78,   ← total number of people coming
    "declined": 5
  },
  "rsvps": [...]
}
```

---

## 🔄 Re-deploying after changes

```bash
fly deploy
```
That's it — zero downtime rolling deploy.

---

## 🌍 Custom Domain (Optional)

```bash
fly certs add yourdomain.com
fly certs add www.yourdomain.com
```
Then point your DNS:
- `A` record → `<your fly IP>` (get it with `fly ips list`)
- Or `CNAME` → `karim-nada-wedding.fly.dev`

---

## 💡 Tips

- Fly.io free tier includes **3 shared VMs** and **3GB volume storage** — more than enough
- The app auto-sleeps when not in use to save resources, and wakes up instantly on request
- SQLite data **persists** in `/data` even after re-deploys because it's a mounted volume
