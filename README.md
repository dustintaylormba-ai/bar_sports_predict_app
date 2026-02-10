# Bar Sports Predict App

Free-to-play, in-bar sports prediction game night.

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Postgres + Auth + Realtime)
- SportsDataIO (Replay now; Live later)

## Local dev

1) Install deps
```bash
npm install
```

2) Create `.env.local`
```bash
cp .env.example .env.local
```

Fill in:
- `SPORTSDATAIO_API_KEY`
- (later) Supabase keys

3) Run dev server
```bash
npm run dev
```

Open http://localhost:3000

## SportsDataIO Replay smoke test

Once `SPORTSDATAIO_API_KEY` is set, hit:

- `GET /api/sportsdataio/replay/nba/pbp/22433`

This proxies SportsDataIO Replay play-by-play and keeps the API key server-side.

## Notes
- Don’t paste API keys into Discord or issues—even if it “feels private.” Rotate immediately if leaked.
