# cnip-web

Current TanStack Start web app for `cnip.io`.

## Stack

- TanStack Start
- TanStack Router
- TanStack Query
- Vite
- React 19
- TypeScript
- Leaflet-compatible map tiles
- lucide-react icons

## Scripts

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3010
npm exec tsc -- --noEmit
npm run build
npm run start
```

## Runtime

The app uses `server.mjs` in production. It serves `dist/client` assets directly and forwards all remaining requests to the TanStack Start server bundle.

## Environment

Defaults are defined in `src/lib/api.ts`.

- `VITE_API_BASE`
- `VITE_DOCS_BASE`
- `VITE_DOCS_REQUEST_BASE`
- `VITE_TILE_BLUE_LIGHT`
- `VITE_TILE_BLUE_DARK`
- `VITE_TILE_ROAD`
- `VITE_TILE_SATELLITE`
- `VITE_TILE_TERRAIN`

Use `.env.local` for local overrides.
