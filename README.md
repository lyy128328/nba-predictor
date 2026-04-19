# NBA Predictor

Simple NBA playoff prediction pool built with Next.js App Router and Supabase.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Copy [supabase/schema.sql](/Users/yingyi_liao/Documents/SideProjects/nba-predictor/supabase/schema.sql) into the SQL editor and run it.
3. Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_SECRET=choose_a_long_random_secret
```

The app now expects all writes to go through Next.js API routes using the service role key on the server. The SQL policy set leaves public access as read-only.

## Included

- Landing page to create or join a pool
- Pool page with series picks, leaderboard, and activity feed
- Starter playoff series inserted automatically when a pool is created
- API routes for users, pools, picks, series, leaderboard, and admin results
- Locked series can no longer be edited once `lock_at` passes
- Simple admin page at `/admin` protected by `ADMIN_SECRET`

## Notes

- Picks are stored in the `picks` table and replaced on each submit
- Locked-series picks are preserved and cannot be overwritten by later submissions
- Leaderboard scoring is computed from `series.winner_short_name` and `series.result_games`
- Visit `/admin` to finalize a series and update standings
