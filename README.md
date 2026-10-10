# Energy Journal

React + Vite energy journal with Supabase authentication/storage and an optional Telegram bot.

## Telegram bot features

- Connect a Telegram chat to a signed-in account using a one-time code in the website.
- Save entries by sending messages such as `Прогулка — энергия 8` or `Работа, 4/10`.
- `/today` lists today's entries; `/stats` provides basic energy observations.
- `/reminder 20:00` configures daily reminders (Europe/Moscow by default); `/reminder off` disables them.
- Website and bot use the same `public.entries` table.

## Setup required before the bot can run

### 1. Run the database migration

Open Supabase Dashboard -> SQL Editor and run [supabase/telegram.sql](supabase/telegram.sql). The existing `public.entries` table must have columns `user_id`, `activity`, `notes`, `energy`, `category`, `mood`, `date`, and `created_at`.

### 2. Configure Vercel environment variables

In Project Settings -> Environment Variables, set:
- `SUPABASE_URL` — project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role secret; server-side only, never use a `VITE_` prefix.
- `TELEGRAM_BOT_TOKEN` — token from Telegram's official @BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — random secret containing only letters, digits, underscores or hyphens.
- `CRON_SECRET` — random secret used to protect the scheduled reminder endpoint.

Redeploy after adding variables.

### 3. Register the webhook

Create a bot through @BotFather, deploy the site, then open this URL after replacing placeholders (do not share the token publicly):
```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_DEPLOYED_DOMAIN>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

### 4. Connect your account

Sign in to the website, use the **Connect Telegram** panel to create a one-time code, then send `/link CODE` to your bot. The code expires in 10 minutes.

### 5. Reminders

The Vercel Cron endpoint checks users every minute and sends a reminder at the configured time, at most once per local date. Vercel plan limits may not allow a minutely cron schedule; if so, use an allowed schedule and reminders may be delayed. Default time is 20:00 Europe/Moscow.

## Deployment status

Committing these files does not activate the bot by itself. Run the SQL migration, configure server environment variables, redeploy, create/register the Telegram bot webhook, then connect your account. Never commit bot tokens or the Supabase service-role key.
