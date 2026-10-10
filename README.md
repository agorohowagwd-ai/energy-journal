# Thrive

Personal energy journal: log activities, rate how much energy you have afterwards, and see patterns over time.

React + Vite, with Supabase for sign-in and storing entries. Interface in English and Russian.

## Run locally

```bash
npm install
npm run dev
```

Supabase settings live in `src/supabase.js`. The app reads and writes the `public.entries` table (`user_id`, `activity`, `notes`, `energy`, `category`, `mood`, `date`, `created_at`).

## Deploy

Pushes to `main` deploy automatically on Vercel.

The Telegram bot integration was removed; it is still available in the git history if needed later.
