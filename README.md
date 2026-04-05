# ip2region.io / cnip.io Lookup

一个基于 `Nuxt 3 + Go` 的高性能 IP 查询站点，使用本地 `ip2region` xdb 数据进行查询，支持：

- `IPv4`
- `IPv6`
- 域名输入后自动解析并查询
- `ip2region.net` 自动更新 API
- 移动端优先适配
- 轻量前端，尽量降低首屏开销

## 目录

```text
.
├── data/                 # 放置 ip2region_v4.xdb / ip2region_v6.xdb
├── server/               # Go 后端
└── web/                  # Nuxt 3 前端
```

## 自动更新设计

根据 `ip2region.net` 官方自动更新文档，更新流程如下：

1. 调用“版本信息 API”读取最新 `released_at`
2. 读取本地 xdb header 中的 `createdAt`
3. 将本地时间标准化到当天 `13:00:00` 后与远端版本比较
4. 如有更新，则调用“外用下载 API”下载到临时文件
5. 下载完成后原子替换本地 xdb 文件
6. 通知 Go 服务热重载 searcher

当前实现的自动更新时间为：中国时间每月 `1 号 13:00`。如果 `1 号` 是非工作日，则顺延到下一个工作日的 `13:00` 执行。程序本身不做额外限速判断，是否下载更新完全由远端 `released_at` 与本地 xdb `createdAt` 的比较结果决定。

## 环境变量

复制根目录环境变量：

```bash
cp .env.example .env
```

重点配置：

- `IP2REGION_V4_DB` / `IP2REGION_V6_DB`: 本地 xdb 路径
- `IP2REGION_V4_VERSION_URL` / `IP2REGION_V6_VERSION_URL`: 版本信息 API
- `IP2REGION_V4_DOWNLOAD_URL` / `IP2REGION_V6_DOWNLOAD_URL`: 外用下载 API
- `UPDATE_TIMEZONE`: 自动更新使用的时区，当前默认 `Asia/Shanghai`
- `NUXT_PUBLIC_API_BASE`: 前端请求后端 API 的地址
- `ENHANCE_ENABLED`: 是否开启异步增强查询
- `ENHANCE_API_BASE` / `ENHANCE_API_KEY`: `ip-api` Pro 增强接口配置
- `ENHANCE_API_FIELDS`: 增强接口字段列表
- `ENHANCE_API_LANG`: 增强接口语言，当前默认 `zh-CN`
- 生产域名: `ip2region.io` 和 `cnip.io`

## 启动

### 1. 后端

```bash
cd /Users/gentpan/projects/Ip2region.io/server
go mod tidy
go run ./cmd/api
```

### 2. 前端

```bash
cd /Users/gentpan/projects/Ip2region.io/web
npm install
npm run dev
```

## API

GeoIP 查询接口已独立部署在：

```text
https://api.cnip.io
```

### GeoIP 查询

```http
GET https://api.cnip.io/geoip
GET https://api.cnip.io/geoip?callback=getgeoip
GET https://api.cnip.io/geoip/8.8.8.8
GET https://api.cnip.io/geoip/2404%3A6800%3A4005%3A80a%3A%3A200e
GET https://api.cnip.io/geoip/2404%3A6800%3A4005%3A80a%3A%3A200e?callback=getgeoip
```

- `/geoip`：自动识别当前请求者的真实 IP
- `/geoip/{ip}`：查询指定 IPv4 / IPv6 地址
- `callback`：可选，传入后返回 JSONP

返回字段为扁平结构，例如：

```json
{
  "ip": "185.222.222.222",
  "country_code": "DE",
  "country": "Germany",
  "region": "North Rhine-Westphalia",
  "city": "Dusseldorf",
  "postal_code": "40210",
  "latitude": "51.221720",
  "longitude": "6.776160",
  "timezone": "Europe/Berlin",
  "asn": "AS24013",
  "isp": "Example ISP"
}
```

### 访客 IP

```http
GET https://api.cnip.io/
```

### 查询接口

```http
GET https://api.cnip.io/lookup?q=8.8.8.8
GET https://api.cnip.io/lookup?q=cnip.io
```

### 异步增强信息

```http
GET https://api.cnip.io/enrich?q=8.8.8.8
GET https://api.cnip.io/enrich?q=cnip.io
```

## `ip2region.net` 自动更新接口说明

本项目实现基于官方文档的如下接口模式：

- 版本信息 API 示例：
  `https://ip2region.net/api/public/data/offline/ver_latest?...`
- 下载 API 示例：
  `https://ip2region.net/api/public/data/offline/get_file?...`

当前已写入的 `IPv4 高级版` 示例配置：

```text
IP2REGION_V4_VERSION_URL=https://ip2region.net/api/public/data/offline/ver_latest?t=6cb96dca7d.3e0.69944e4b.OF002@GJB
IP2REGION_V4_DOWNLOAD_URL=https://ip2region.net/api/public/data/offline/get_file?t=6cb96dca7d.3e0.69944e4b.OF002@GJB&v=v001@full
```

当前已写入的 `IPv6` 版本信息 API：

```text
IP2REGION_V6_VERSION_URL=https://ip2region.net/api/public/data/offline/ver_latest?t=646a0d6627.3e0.69944e81.OS002@GJB
IP2REGION_V6_DOWNLOAD_URL=https://ip2region.net/api/public/data/offline/get_file?t=646a0d6627.3e0.69944e81.OS002@GJB&v=v001@full
```

参考资料：

- [商用数据-自动更新](https://ip2region.net/doc/data/ipv4_data_update)
- [商用数据](https://ip2region.net/products/offline)
- [ip2region GitHub](https://github.com/lionsoul2014/ip2region)

## 说明

- 仓库内没有附带商业版 xdb 数据，请将你自己的 `v4/v6 xdb` 放到 `data/` 目录或其他自定义路径。
- 当前实现已经预填了你提供的 `IPv4` 与 `IPv6` 版本信息 API 和下载 API。
- 域名查询会通过系统 DNS 解析出 `A/AAAA` 记录，再分别查询本地数据库。
- 当前站点使用域名为 `ip2region.io` 和 `cnip.io`。
- “工作日” 当前按周一到周五计算，未接入中国法定节假日调休表。
- `cnip.io` 当前采用“本地 `ip2region` 先返回，增强接口异步补充”的模式，增强信息用于补 `org / asname / proxy / hosting / mobile / reverse`。
- 当前增强接口默认按你提供的 `ip-api` Pro 查询格式调用：`fields=...&lang=zh-CN`
