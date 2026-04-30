# Supabase setup (one-time)

Boyscation uses Supabase as the backend for trip sharing & sync. This is a **free tier** setup — you won't be charged.

## 1. Create a Supabase project

1. Go to https://supabase.com and sign up (GitHub login is fastest).
2. Click **New Project**.
3. Name: `boyscation` (or anything). Password: generate a strong one and save it somewhere — you won't need it day-to-day but Supabase requires it.
4. Region: pick the one closest to you / your friends (e.g. `us-east-1`).
5. Click **Create new project** and wait ~2 minutes for provisioning.

## 2. Run the schema migration

1. Once the project is ready, open **SQL Editor** (left sidebar).
2. Click **+ New query**.
3. Open [supabase/migration.sql](supabase/migration.sql) in this repo, copy the entire contents, paste into the SQL editor.
4. Click **Run** (bottom right). You should see "Success. No rows returned."
5. Verify: go to **Table Editor** — you should see tables `trips`, `activities`, `settlements`, `ideas`.

## 3. Grab your API credentials

1. Open **Settings → API** (left sidebar, gear icon).
2. Copy two values:
   - **Project URL** — looks like `https://xxxxxxxx.supabase.co`
   - **anon public key** — a long `eyJhbG...` string (under "Project API keys")

## 4. Configure the app

In the project root (`/Users/william/Desktop/boyscation`), create a file named `.env.local` (not committed to git) with:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your-long-anon-key...
```

Replace with the values from step 3. Save the file.

> ℹ️ The `anon` key is safe to ship in the bundled frontend — all security is enforced by the Row Level Security policies installed in step 2. Never commit your **service_role** key (you won't need it).

## 5. Build & deploy

From the project root:

```
npm install         # if not already done
npm run build       # verifies everything compiles with the env vars
npm run deploy      # pushes to GitHub Pages
```

Your live site at https://williamchiem4.github.io/boyscation/ now has sharing enabled.

## How sharing works

- Click **Share & sync** on any newly created trip.
- You get three URLs:
  - **Admin** — your own bookmark. Can edit everything, share new links, delete the trip.
  - **Editor** — friends who can add/edit activities.
  - **Viewer** — friends who can only see and submit ideas.
- Treat the **admin URL like a password**. Anyone with it has full control.
- If you lose the admin URL, check localStorage in your browser — or regenerate via the Supabase dashboard (future feature: in-app token rotation).

## Troubleshooting

- **"Missing env vars" error in browser console** — make sure `.env.local` exists and you restarted `npm run dev` / rebuilt after creating it.
- **Shared links 404** — check the Supabase Table Editor: does the trip exist in the `trips` table? If not, provisioning failed — check browser console for the exact error.
- **"new row violates row-level security policy"** — the RLS policies weren't installed. Re-run the migration SQL.

## Free tier limits (v1 will not come close)

- 500 MB database
- 1 GB file storage
- 50,000 monthly active users
- 2 GB egress/month
