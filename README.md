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
- `NEXT_PUBLIC_SPORTSDATAIO_SOURCE` (`replay` or `live`; defaults to `replay`)
- Supabase keys

3) Run dev server
```bash
npm run dev
```

Open http://localhost:3000

## SportsDataIO endpoints

The API key stays server-side. Depending on `NEXT_PUBLIC_SPORTSDATAIO_SOURCE`, the patron client will call one of these proxy routes:

- Replay (default): `GET /api/sportsdataio/replay/nba/pbp/:gameId`
- Live: `GET /api/sportsdataio/live/nba/pbp/:gameId`

The proxy selects either `SPORTSDATAIO_REPLAY_BASE_URL` or `SPORTSDATAIO_LIVE_BASE_URL` under the hood.

## Notes
- Don’t paste API keys into Discord or issues—even if it “feels private.” Rotate immediately if leaked.
