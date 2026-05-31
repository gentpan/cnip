# Deployment Notes

This repository now uses one unified backend for `cnip.io`, plus one separate backend for `ipx.ee`:

- `server/`: unified `cnip.io` backend powered by local paid `ip2region` xdb files
- `ipapi/`: `ipx.ee` backend powered by `ip-api` upstream requests

Recommended runtime ports:

- `cnip.io`: `127.0.0.1:18083`
- `ipx.ee`: `127.0.0.1:18084`

Recommended runtime layout on the server:

- `/opt/ip2region.io`
- `/opt/ipx.ee-ipapi`

Recommended domain topology:

- `cnip.io` / `www.cnip.io`: main static site
- `api.cnip.io`: unified API entry
- `ip2region.io` / `www.ip2region.io`: `301` redirect to `https://cnip.io`

Example assets in this folder:

- `deploy/ip2region-backend.service`
- `deploy/cnip.io.nginx.conf`
- `deploy/api.cnip.io.nginx.conf`
- `deploy/ip2region.io.nginx.conf`
- `deploy/bootstrap-ip2region-db.sh`
- `deploy/ipapi-backend.service`
- `deploy/ipx.ee.nginx.conf`
