# cnip

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-1.167-FF4154?logo=reactrouter&logoColor=white)
![TanStack Router](https://img.shields.io/badge/TanStack%20Router-1.167-FF4154)
![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5.101-FF4154)
![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy-Reverse%20Proxy-1F88C0)

`cnip` is the frontend and deployment workspace for [cnip.io](https://cnip.io), a lightweight IP and domain lookup experience with map-based location context, IPv4 / IPv6 support, domain DNS resolution results, and public API documentation.

The current production frontend lives in `apps/web` and is built with TanStack Start, TanStack Router, TanStack Query, Vite, React, and TypeScript.

## Features

- Current public IP lookup
- IPv4 and IPv6 lookup
- Domain lookup with multiple resolved IP results
- Result-card navigation with map coordinate syncing
- Light and dark themes with persisted user preference
- Local and Google map tile style switching
- Responsive navigation, result cards, docs, and footer UI
- API documentation page with runnable examples
- Static assets, favicon, app icons, and emoji-style SVG icons
- Production deployment behind Caddy and a Node service

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | TanStack Start |
| Routing | TanStack Router |
| Data fetching | TanStack Query |
| Build tool | Vite |
| UI runtime | React 19 |
| Language | TypeScript |
| Icons | lucide-react and SVG assets |
| Maps | Leaflet-compatible tile layers |
| Production server | Node.js custom server |
| Reverse proxy | Caddy |

## Repository Layout

```text
.
├── apps/
│   └── web/              # Current TanStack Start production app
├── deploy/               # Deployment notes and service templates
├── legacy/
│   ├── static-cnip/      # Static assets migrated from the previous site
│   ├── web-cnip-nuxt/    # Legacy cnip.io Nuxt implementation
│   ├── web-ip2region-nuxt/
│   └── web-nuxt-shared/  # Older shared Nuxt implementation
├── server/               # Lookup backend service
└── ipapi/                # ipx.ee helper backend
```

## Local Development

```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 3010
```

Open `http://127.0.0.1:3010`.

## Build

```bash
cd apps/web
npm run build
```

The production output is generated in `apps/web/dist`.

## Production Start

```bash
cd apps/web
npm run start
```

The production service uses `server.mjs`, which serves the Vite client assets first and then falls back to the TanStack Start server entry.

## Environment

`apps/web` defaults to safe runtime values:

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE` | Lookup API base used by the app | `/api` |
| `VITE_DOCS_BASE` | Public base URL shown in API docs | `https://api.cnip.io` |
| `VITE_DOCS_REQUEST_BASE` | Base URL used by docs runner requests | `/api` |
| `VITE_TILE_BLUE_LIGHT` | CNIP light tile source | `https://map.bluecdn.com/styles/positron/{z}/{x}/{y}@2x.png` |
| `VITE_TILE_BLUE_DARK` | CNIP dark tile source | `https://map.bluecdn.com/styles/dark-matter/{z}/{x}/{y}@2x.png` |
| `VITE_TILE_ROAD` | Google road tile source | Google road tiles |
| `VITE_TILE_SATELLITE` | Google satellite tile source | Google satellite tiles |
| `VITE_TILE_TERRAIN` | Google terrain tile source | Google terrain tiles |

Production secrets, private keys, database files, and server-only credentials should stay outside the repository.

## Validation

Before deploying or pushing changes:

```bash
cd apps/web
npm exec tsc -- --noEmit
npm run build
```

Recommended manual checks:

- Home page loads without theme flicker
- Current IP result appears correctly
- IPv4 / IPv6 switching works
- Domain lookup shows all resolved records
- Clicking a resolved record focuses the related result card
- Map point follows the active result
- Light/dark theme also switches the default map tiles
- Docs page can run examples
- Favicon and navigation logo render correctly

## Deployment Notes

The current production deployment uses:

- Node.js service for the TanStack Start app
- Caddy for TLS and reverse proxying
- `/api` proxying to the lookup backend
- Static public assets served from the app build output

Typical server workflow:

```bash
cd /opt/cnip-start/current
npm ci
npm run build
systemctl restart cnip-start
systemctl is-active cnip-start
caddy validate --config /etc/caddy/Caddyfile
```

## License

Private project. All rights reserved.
