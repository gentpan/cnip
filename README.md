<div align="center">
  <img src="apps/web/public/favicon.svg" width="92" height="92" alt="cnip logo" />
  <h1>cnip</h1>
  <p>IP, IPv6, domain DNS and map-based geolocation lookup for cnip.io.</p>
  <p>
    <img src="https://img.shields.io/badge/cnip-IP%20Geolocation-09090b?style=for-the-badge" alt="cnip IP Geolocation" />
    <img src="https://img.shields.io/badge/TanStack%20Start-React-ff4154?style=for-the-badge&logo=react&logoColor=white" alt="TanStack Start" />
    <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111111" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-7.3-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Caddy-Reverse%20Proxy-1f88c0?style=for-the-badge" alt="Caddy" />
    <img src="https://img.shields.io/badge/ip2region-Paid%20Edition-10b981?style=for-the-badge" alt="ip2region paid edition" />
    <img src="https://img.shields.io/badge/License-Proprietary-71717a?style=for-the-badge" alt="License: Proprietary" />
  </p>
  <p><strong>IP database source:</strong> ip2region paid edition.</p>
  <p><a href="#english">English</a> · <a href="#中文">中文</a></p>
</div>

## English

`cnip` is the frontend and deployment workspace for [cnip.io](https://cnip.io), a lightweight IP and domain lookup experience with map-based location context, IPv4 / IPv6 support, domain DNS resolution results, and public API documentation.

The current production frontend lives in `apps/web` and is built with TanStack Start, TanStack Router, TanStack Query, Vite, React, and TypeScript.

### Features

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

### Tech Stack

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
| IP database | ip2region paid edition |
| Production server | Node.js custom server |
| Reverse proxy | Caddy |

### Repository Layout

```text
.
├── apps/
│   └── web/              # Current TanStack Start production app
├── deploy/               # Deployment notes and service templates
├── data/                 # Local database placeholders and runtime data
└── server/               # Lookup backend service
```

### Local Development

```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 3010
```

Open `http://127.0.0.1:3010`.

### Build

```bash
cd apps/web
npm run build
```

The production output is generated in `apps/web/dist`.

### Production Start

```bash
cd apps/web
npm run start
```

The production service uses `server.mjs`, which serves the Vite client assets first and then falls back to the TanStack Start server entry.

### Environment

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

### Validation

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

### Deployment Notes

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

### License

Private project. All rights reserved.

## 中文

`cnip` 是 [cnip.io](https://cnip.io) 的前端与部署工作区，提供轻量的 IP、IPv6、域名解析与地图定位查询体验。项目支持当前公网 IP 查询、IPv4 / IPv6 查询、域名多解析结果展示、地图坐标联动和公开 API 文档。

当前生产前端位于 `apps/web`，技术栈为 TanStack Start、TanStack Router、TanStack Query、Vite、React 和 TypeScript。

### 功能

- 当前公网 IP 查询
- IPv4 和 IPv6 查询
- 域名查询，并展示多个解析 IP 结果
- 结果卡片点击导航和地图坐标联动
- 深色 / 浅色主题，并持久化用户偏好
- 本地地图瓦片和 Google 地图瓦片切换
- 响应式导航栏、结果卡片、文档页和页脚
- API 文档页面，支持示例请求运行
- 静态资源、favicon、应用图标和 SVG 图标资源
- 通过 Caddy 和 Node 服务部署生产环境

### 技术栈

| 模块 | 技术 |
| --- | --- |
| 应用框架 | TanStack Start |
| 路由 | TanStack Router |
| 数据请求 | TanStack Query |
| 构建工具 | Vite |
| UI 运行时 | React 19 |
| 开发语言 | TypeScript |
| 图标 | lucide-react 和 SVG 资源 |
| 地图 | Leaflet 兼容瓦片图层 |
| IP 数据库 | ip2region 付费版本 |
| 生产服务 | Node.js 自定义服务 |
| 反向代理 | Caddy |

### 仓库结构

```text
.
├── apps/
│   └── web/              # 当前 TanStack Start 生产前端
├── deploy/               # 部署说明和服务模板
├── data/                 # 本地数据库占位和运行数据
└── server/               # 查询后端服务
```

### 本地开发

```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 3010
```

打开 `http://127.0.0.1:3010`。

### 构建

```bash
cd apps/web
npm run build
```

生产构建产物位于 `apps/web/dist`。

### 生产启动

```bash
cd apps/web
npm run start
```

生产服务使用 `server.mjs`。它会优先提供 Vite 客户端静态资源，其余请求再交给 TanStack Start 服务端入口处理。

### 环境变量

`apps/web` 默认包含安全的运行时配置：

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE` | 应用使用的查询 API 地址 | `/api` |
| `VITE_DOCS_BASE` | API 文档中展示的公开基础地址 | `https://api.cnip.io` |
| `VITE_DOCS_REQUEST_BASE` | 文档示例运行时请求地址 | `/api` |
| `VITE_TILE_BLUE_LIGHT` | CNIP 浅色地图瓦片 | `https://map.bluecdn.com/styles/positron/{z}/{x}/{y}@2x.png` |
| `VITE_TILE_BLUE_DARK` | CNIP 深色地图瓦片 | `https://map.bluecdn.com/styles/dark-matter/{z}/{x}/{y}@2x.png` |
| `VITE_TILE_ROAD` | Google 路网瓦片 | Google road tiles |
| `VITE_TILE_SATELLITE` | Google 卫星瓦片 | Google satellite tiles |
| `VITE_TILE_TERRAIN` | Google 地形瓦片 | Google terrain tiles |

生产密钥、私钥、数据库文件和服务器专用凭据不应提交到仓库。

### 验证

部署或推送前建议执行：

```bash
cd apps/web
npm exec tsc -- --noEmit
npm run build
```

建议人工检查：

- 首页没有主题闪烁
- 当前 IP 结果显示正常
- IPv4 / IPv6 切换正常
- 域名查询可以展示全部解析记录
- 点击解析记录可以定位到对应结果卡片
- 地图蓝点跟随当前结果
- 深色 / 浅色主题会同步切换默认地图瓦片
- Docs 页面示例可以运行
- favicon 和导航 logo 显示正常

### 部署说明

当前生产部署使用：

- Node.js 服务运行 TanStack Start 应用
- Caddy 负责 TLS 和反向代理
- `/api` 代理到查询后端
- 静态资源由应用构建产物提供

常用服务器流程：

```bash
cd /opt/cnip-start/current
npm ci
npm run build
systemctl restart cnip-start
systemctl is-active cnip-start
caddy validate --config /etc/caddy/Caddyfile
```

### License

Private project. All rights reserved.
