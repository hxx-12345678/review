# Render Free Tier — Eliminate the ~50s Cold Start

## Why the delay happens

Render **free** web services spin down after **15 minutes without inbound traffic**
([Render docs](https://render.com/docs/free)). The next request cold-starts a fresh
container (~50s for our Node/Express API — this matches what users reported).
An in-app cron (`node-cron`) **cannot** fix this: the process is fully stopped,
so nothing inside the app runs while asleep. Render's own Cron Jobs need a paid
plan. The fix must come from **outside**: an external pinger.

## Recommended: UptimeRobot (free, 5-min checks + downtime alerts)

1. Sign up at <https://uptimerobot.com> (free: 50 monitors, 5-min interval).
2. Add monitor → type **HTTP(s)** → URL:
   `https://<your-api-service>.onrender.com/api/health`
   (`/api/health` answers without touching the DB — cheapest possible wake-up.)
3. Interval: **5 minutes** (safely under the 15-min sleep window, with margin
   for one missed ping).
4. Add an email alert so you also learn when the service is genuinely down.

## Alternative: cron-job.org (free, custom schedule)

1. Sign up at <https://cron-job.org> → Create cronjob.
2. URL: `https://<your-api-service>.onrender.com/api/health`
3. Schedule `*/10 * * * *` (every 10 min — 5-min buffer before sleep).
4. Enable failure notifications (doubles as uptime monitoring).
5. Note: cron-job.org times out at 30s — the *first* ping after a sleep may
   show failed while still waking the service; subsequent pings succeed.

## Free-hours math

- 24/7 pinging ≈ 720 instance-hours/month — inside the 750 free-hour quota,
  but with little margin. If you run 2+ free services, restrict pings to
  waking hours instead, e.g. cron-job.org `*/10 5-23 * * *` (IST business
  hours ≈ 540h/month).

## What we already did in code

- `GET /api/health` is DB-free (ideal ping target).
- Server boot skips all 9 plan upserts when nothing changed + logs boot ms
  (`server/src/index.ts` → `seedDefaultPlans`), trimming cold-start time.
- Client survives one cold start: boot fetches (`/auth/me`, `/businesses`)
  retry once with a 45s second attempt (`fetchWithRetry` in `client/lib/api.ts`);
  dashboard shows an honest error + Retry instead of a fake empty state.

## Permanent fix

Render **Starter ($7/mo)** never sleeps — upgrade the API service when the
business justifies it and delete the pinger.
