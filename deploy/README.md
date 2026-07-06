# Deployment Notes

This repository contains the current `cnip.io` TanStack Start web app plus the lookup backend used by the IP lookup stack.

## Current Layout

- `web/`: current TanStack Start frontend for `cnip.io`
- `api/`: lookup backend powered by local `ip2region` xdb files
- `deploy/`: production proxy and service templates
- `data/`: local database placeholders and runtime data

## Recommended Runtime

Current production layout:

- Web app process: `cnip-web.service`
- Web app release root: `/opt/cnip/web/current`
- API backend root: `/opt/cnip/api`
- API backend process: `cnip-api.service`
- Web app bind address: `127.0.0.1:3011`
- Lookup backend bind address: `127.0.0.1:18083`
- Reverse proxy: Caddy

`cnip.io` and `www.cnip.io` are served by Caddy and proxied to the Node/TanStack Start app. API routes are proxied to the lookup backend.

## Web App Deploy

```bash
cd /opt/cnip/web/current
npm ci
npm run build
systemctl restart cnip-web
systemctl is-active cnip-web
systemctl restart cnip-api
systemctl is-active cnip-api
```

## Caddy Checks

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl is-active caddy
```
