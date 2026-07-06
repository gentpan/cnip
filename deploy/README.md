# Deployment Notes

This repository contains the current `cnip.io` TanStack Start web app plus backend services used by the broader IP lookup stack.

## Current Layout

- `apps/web/`: current TanStack Start frontend for `cnip.io`
- `server/`: lookup backend powered by local `ip2region` xdb files
- `ipapi/`: `ipx.ee` helper backend powered by upstream `ip-api` requests
- `legacy/`: previous Nuxt/static frontend implementations kept for reference

## Recommended Runtime

Current production layout:

- Web app release root: `/opt/cnip-start/current`
- Web app process: `cnip-start.service`
- Web app bind address: `127.0.0.1:3011`
- Lookup backend bind address: `127.0.0.1:18083`
- Reverse proxy: Caddy

`cnip.io` and `www.cnip.io` are served by Caddy and proxied to the Node/TanStack Start app. API routes are proxied to the lookup backend.

## Web App Deploy

```bash
cd /opt/cnip-start/current
npm ci
npm run build
systemctl restart cnip-start
systemctl is-active cnip-start
```

## Caddy Checks

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl is-active caddy
```

## Legacy Assets

The old Nuxt/static frontends are no longer the primary app. They are kept under `legacy/` only for reference and migration history.
