# cnip.io

`cnip.io` 是一个基于 `Nuxt 3 + Go` 的双栈 IP 查询站点。项目重点是前端体验、IPv4/IPv6 自动探测、本地数据库查询、静态站点部署和服务端运维配置。

本 README 只保留项目说明和维护流程，不提供公开接口文档、调用地址、下载地址、密钥格式或生产环境敏感信息。

## 功能

- IPv4 / IPv6 双栈查询
- 浏览器自动识别当前公网 IP
- 当前 IP 的 IPv4 / IPv6 快速切换
- 支持输入域名后解析并查询
- 使用本地 `ip2region` xdb 数据库
- 支持数据库定期更新和服务热加载
- 移动端优先适配
- 前端静态化部署，后端仅作为内部服务运行

## 目录

```text
.
├── data/                 # 数据库占位目录，真实 xdb 不提交
├── deploy/               # systemd / 反向代理部署模板
├── ipapi/                # 辅助服务
├── server/               # 主 Go 后端服务
├── web-cnip/             # cnip.io 前端
├── web-ip2region/        # ip2region 相关前端
└── web/                  # 历史/共享前端实现
```

## 架构

生产环境采用静态前端 + 内部后端服务的方式：

- Nuxt 构建静态文件，由 Web 服务器直接提供。
- Go 后端只监听服务器本地地址。
- 反向代理负责 TLS、缓存策略、真实客户端 IP 传递和站点路由。
- xdb 数据库文件只放在服务器，不进入 Git。
- IPv4 / IPv6 探测由受控网络路径完成，避免依赖第三方探测服务。

## 配置

使用各目录中的 `.env.example` 作为模板，真实配置只保存在服务器或本地开发环境。

配置项按用途分为：

- IPv4 / IPv6 数据库路径
- 数据库版本检查和下载配置
- 后端监听地址和端口
- 管理和更新凭据
- 前端运行时基础路径
- 地图资源代理配置
- 可选增强数据源配置

不要提交以下内容：

- 生产 `.env`
- xdb 数据库
- 服务商密钥
- 下载链接
- SSH 私钥
- 服务器账号或密码

## 本地开发

### 后端

```bash
cd server
go mod tidy
go run ./cmd/api
```

### 前端

```bash
cd web-cnip
npm install
npm run dev
```

本地开发时，通过环境变量把前端运行时请求指向本地后端或本地反向代理。

## 构建

### 后端

```bash
cd server
go build -o ip2region-backend ./cmd/api
```

生产 Linux 二进制：

```bash
cd server
GOOS=linux GOARCH=amd64 go build -o ip2region-backend ./cmd/api
```

### 前端

```bash
cd web-cnip
npm run build
```

静态产物目录：

```text
web-cnip/.output/public
```

## 部署

部署模板位于 `deploy/`。

当前生产后端服务目录：

```text
/opt/ip2region.io/api
```

后端二进制路径：

```text
/opt/ip2region.io/api/bin/ip2region-backend
```

前端静态文件独立部署到反向代理配置的站点根目录。

后端更新后：

```bash
systemctl restart ip2region-backend
systemctl is-active ip2region-backend
```

反向代理配置更新后：

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## 数据库更新

后端支持本地 xdb 数据库刷新流程：

1. 检查上游版本信息。
2. 对比本地数据库元信息。
3. 有新版本时下载到临时文件。
4. 下载完成后原子替换。
5. 热加载新的查询数据。

仓库不包含商业数据库文件。生产数据库只保存在服务器。

## 验证

提交或部署前建议执行：

```bash
cd server
go test ./...
```

```bash
cd ipapi
go test ./...
```

```bash
cd web-cnip
npm run build
```

前端改动需要重点检查：

- 首页当前 IP 是否显示
- IPv4 / IPv6 切换状态是否正确
- IPv6 是否完整显示
- 查询结果是否居中且不遮挡标签
- 移动端布局是否正常

## 安全要求

- README 不写公开调用入口。
- README 不写接口路径和请求示例。
- README 不写生产下载链接。
- README 不写任何密钥、凭据或账号信息。
- 数据库和生产配置只保存在服务器。

## License

Private project. All rights reserved.
