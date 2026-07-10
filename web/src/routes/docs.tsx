import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { type FormEvent, useMemo, useState } from 'react'
import { DOCS_BASE, DOCS_REQUEST_BASE } from '@/lib/api'
import { apiDocsJsonLd, canonicalLink, jsonLdScript, seoMeta } from '@/lib/seo'

type EndpointParam = {
  name: string
  required: boolean
  desc: string
  location: 'path' | 'query'
  placeholder?: string
  defaultValue?: string
}

type Endpoint = {
  method: 'GET'
  path: string
  title: string
  desc: string
  category: string
  responseType: 'json' | 'text'
  params: EndpointParam[]
  buildUrl: (values: Record<string, string>, base?: string) => string
}

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/geoip',
    title: '查询当前 IP 归属地',
    desc: '根据请求来源自动识别当前公网 IP，并返回归属地、运营商、ASN、经纬度、时区等字段。适合在服务端或脚本里快速确认出口地址和网络位置。',
    category: 'GeoIP',
    responseType: 'json',
    params: [],
    buildUrl: (_values, base = DOCS_BASE) => `${base}/geoip`,
  },
  {
    method: 'GET',
    path: '/geoip/{ip}',
    title: '查询指定 IP 归属地',
    desc: '查询指定 IPv4 或 IPv6 的归属信息。返回字段包含 ip、country、province、city、isp、asn、latitude、longitude、timezone 等，字段为空时表示数据库未命中对应信息。',
    category: 'GeoIP',
    responseType: 'json',
    params: [{ name: 'ip', required: true, desc: 'IPv4 或 IPv6 地址', location: 'path', placeholder: '例如 8.8.8.8 或 2400:3200::1', defaultValue: '8.8.8.8' }],
    buildUrl: (values, base = DOCS_BASE) => `${base}/geoip/${encodeURIComponent((values.ip || '').trim())}`,
  },
  {
    method: 'GET',
    path: '/geoip/{ip}?callback={callback}',
    title: 'JSONP 跨域调用',
    desc: '以 application/javascript 返回 callback(data)，适合仍需要 JSONP 的旧页面。新项目建议优先使用普通 JSON 接口。',
    category: 'GeoIP',
    responseType: 'text',
    params: [
      { name: 'ip', required: true, desc: 'IPv4 或 IPv6 地址', location: 'path', placeholder: '例如 8.8.8.8', defaultValue: '8.8.8.8' },
      { name: 'callback', required: true, desc: '回调函数名', location: 'query', placeholder: '例如 getgeoip', defaultValue: 'getgeoip' },
    ],
    buildUrl: (values, base = DOCS_BASE) => `${base}/geoip/${encodeURIComponent((values.ip || '').trim())}?callback=${encodeURIComponent((values.callback || '').trim())}`,
  },
  {
    method: 'GET',
    path: '/lookup?q={q}',
    title: '综合查询（IP / 域名）',
    desc: '统一查询入口。q 可以是 IPv4、IPv6 或域名；输入域名时会使用默认 DNS 解析，再返回 resolvedIps 和每个 IP 对应的归属地结果。多个 DNS 解析源仅在前端查询页面提供切换。',
    category: 'Lookup',
    responseType: 'json',
    params: [
      { name: 'q', required: true, desc: 'IP 地址或域名', location: 'query', placeholder: '例如 114.114.114.114 或 baidu.com', defaultValue: 'baidu.com' },
    ],
    buildUrl: (values, base = DOCS_BASE) => {
      const params = new URLSearchParams({ q: (values.q || '').trim() })
      return `${base}/lookup?${params.toString()}`
    },
  },
  {
    method: 'GET',
    path: '/ssl/{host}',
    title: '查询 SSL 证书',
    desc: '查询指定域名 443 端口的 SSL/TLS 证书信息，返回签发方、有效期、剩余天数和当前状态。',
    category: 'SSL',
    responseType: 'json',
    params: [
      { name: 'host', required: true, desc: '域名或公网 IP', location: 'path', placeholder: '例如 example.com', defaultValue: 'example.com' },
    ],
    buildUrl: (values, base = DOCS_BASE) => `${base}/ssl/${encodeURIComponent((values.host || '').trim())}`,
  },
  {
    method: 'GET',
    path: '/',
    title: '获取当前公网 IP',
    desc: '返回当前请求的公网 IP，响应为 JSON，例如 {"ip":"203.0.113.10"}。如果只需要纯文本，可使用 v4.cnip.io 或 v6.cnip.io。',
    category: 'IP',
    responseType: 'json',
    params: [],
    buildUrl: (_values, base = DOCS_BASE) => `${base}/`,
  },
]

const quickExamples = [
  { label: '查询当前 IP 归属地', cmd: `curl "${DOCS_BASE}/geoip"` },
  { label: '查询指定 IP', cmd: `curl "${DOCS_BASE}/geoip/8.8.8.8"` },
  { label: '查询域名归属地', cmd: `curl "${DOCS_BASE}/lookup?q=baidu.com"` },
  { label: '查询 SSL 证书', cmd: `curl "${DOCS_BASE}/ssl/example.com"` },
  { label: '获取当前公网 IPv4', cmd: 'curl -4 "https://v4.cnip.io"' },
  { label: '获取当前公网 IPv6', cmd: 'curl -6 "https://v6.cnip.io"' },
  { label: '获取 IPv4（JSON 格式）', cmd: 'curl -4 "https://v4.cnip.io/json"' },
  { label: '获取 IPv6（JSON 格式）', cmd: 'curl -6 "https://v6.cnip.io/json"' },
]

export const Route = createFileRoute('/docs')({
  head: () => ({
    meta: seoMeta({
      title: 'API 文档 - IP 归属地、IPv6 与域名解析查询接口',
      description: 'cnip.io 免费公开 API 文档，提供当前公网 IP、指定 IPv4/IPv6、域名解析、多 IP 归属地、JSONP、v4/v6 出口检测等查询示例。',
      path: '/docs',
      keywords: ['IP查询API', 'GeoIP API', 'IPv6 API', '域名解析API', 'JSONP IP查询', '公网IP API'],
      type: 'article',
    }) as never,
    links: [canonicalLink('/docs')],
    scripts: [jsonLdScript(apiDocsJsonLd('/docs'))],
  }),
  component: Docs,
})

function makeInitialValues(endpoint: Endpoint) {
  return Object.fromEntries(endpoint.params.map((param) => [param.name, param.defaultValue || '']))
}

function CopyIcon() {
  return (
    <svg className="cnp-docs-copy-icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M293.568 486.784C288 528 288 578.688 288 633.92v95.36c0 12.672 0 18.944-4.096 22.784-4.096 3.776-10.24 3.328-22.528 2.432a504.768 504.768 0 0 1-30.336-3.072c-40.96-5.504-74.944-16.576-103.616-40.128a202.816 202.816 0 0 1-28.096-28.032c-24.832-30.272-35.712-66.496-40.96-110.464C53.312 529.92 53.312 475.776 53.312 407.424v-4.16c0-68.352 0-122.56 5.12-165.376 5.12-44.032 16.064-80.192 40.96-110.464 8.32-10.24 17.792-19.648 28.032-28.096 30.272-24.832 66.496-35.712 110.464-40.96C280.768 53.312 334.912 53.312 403.2 53.312h4.16c68.352 0 122.496 0 165.376 5.12 43.968 5.12 80.192 16.064 110.464 40.96 10.24 8.32 19.648 17.792 28.032 28.032 23.552 28.672 34.56 62.72 40.128 103.68 1.28 9.472 2.304 19.584 3.072 30.272 0.896 12.288 1.344 18.432-2.432 22.528-3.84 4.096-10.112 4.096-22.784 4.096h-95.36c-55.232 0-105.856 0-147.2 5.568-45.44 6.08-93.568 20.48-133.12 60.032-39.552 39.552-53.952 87.68-60.032 133.12z" fill="currentColor" />
      <path d="M684.992 352h-47.36c-58.304 0-105.344 0-142.336 4.992-38.4 5.12-70.72 16.192-96.448 41.856-25.664 25.728-36.736 58.048-41.856 96.448C352 532.288 352 579.328 352 637.632v47.36c0 58.368 0 105.408 4.992 142.4 5.12 38.4 16.192 70.72 41.856 96.384 25.728 25.728 58.048 36.736 96.448 41.92 36.992 4.992 84.032 4.992 142.336 4.992h47.36c58.368 0 105.408 0 142.4-4.992 38.4-5.12 70.72-16.192 96.384-41.92 25.728-25.6 36.736-57.984 41.92-96.384 4.992-36.992 4.992-84.032 4.992-142.4v-47.36c0-58.304 0-105.344-4.992-142.336-5.12-38.4-16.192-70.72-41.92-96.448-25.6-25.664-57.984-36.736-96.384-41.856-36.992-4.992-84.032-4.992-142.4-4.992z" fill="currentColor" />
    </svg>
  )
}

function RunIcon() {
  return (
    <svg className="cnp-docs-run-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 5.75v12.5c0 .78.86 1.26 1.52.84l9.75-6.25a1 1 0 0 0 0-1.68L9.52 4.91A1 1 0 0 0 8 5.75Z" fill="currentColor" />
    </svg>
  )
}

function RunnerSpinner() {
  return (
    <svg className="cnp-docs-spinner" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g>
        <circle cx="12" cy="12" r="9.5" fill="none" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="stroke-dasharray" dur="1.5s" calcMode="spline" values="0 150;42 150;42 150;42 150" keyTimes="0;0.475;0.95;1" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" repeatCount="indefinite" />
          <animate attributeName="stroke-dashoffset" dur="1.5s" calcMode="spline" values="0;-16;-59;-59" keyTimes="0;0.475;0.95;1" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" repeatCount="indefinite" />
        </circle>
        <animateTransform attributeName="transform" type="rotate" dur="2s" values="0 12 12;360 12 12" repeatCount="indefinite" />
      </g>
    </svg>
  )
}

async function readRunnerResponse(res: Response, endpoint: Endpoint) {
  const raw = await res.text()
  if (endpoint.responseType !== 'json') return raw
  if (endpoint.path === '/' && !raw.trim().startsWith('{')) {
    return JSON.stringify({ ip: raw.trim() }, null, 2)
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function Docs() {
  const [active, setActive] = useState(0)
  const endpoint = endpoints[active]
  const [values, setValues] = useState<Record<string, string>>(() => makeInitialValues(endpoint))
  const [output, setOutput] = useState<{ status: number; ms: number; type: string; text: string; isJson: boolean } | null>(null)
  const [error, setError] = useState('')
  const [copiedKey, setCopiedKey] = useState('')
  const curl = useMemo(() => `curl "${endpoint.buildUrl(values)}"`, [endpoint, values])

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard?.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((current) => current === key ? '' : current), 1600)
    } catch {
      setCopiedKey('')
    }
  }

  const runner = useMutation({
    mutationFn: async () => {
      const start = performance.now()
      const res = await fetch(endpoint.buildUrl(values, DOCS_REQUEST_BASE))
      const type = res.headers.get('content-type')?.split(';')[0] || (endpoint.responseType === 'json' ? 'application/json' : 'text/plain')
      const text = await readRunnerResponse(res, endpoint)
      return { status: res.status, ms: Math.round(performance.now() - start), type, text, isJson: endpoint.responseType === 'json' }
    },
    onSuccess: (data) => {
      setError('')
      setOutput(data)
    },
    onError: (err) => {
      setOutput(null)
      setError(err instanceof Error ? err.message : '请求失败')
    },
  })

  const switchTab = (index: number) => {
    setActive(index)
    setValues(makeInitialValues(endpoints[index]))
    setOutput(null)
    setError('')
  }

  const run = (event: FormEvent) => {
    event.preventDefault()
    const missing = endpoint.params.find((param) => param.required && !values[param.name]?.trim())
    if (missing) {
      setOutput(null)
      setError(`参数 ${missing.name} 必填`)
      return
    }
    runner.mutate()
  }

  return (
    <section className="cnp-view-page">
      <div className="cnp-view-card cnp-docs">
        <h2>API 文档</h2>
        <p className="cnp-docs-intro">cnip.io 提供免密钥的公开查询接口，支持当前公网 IP、指定 IP、域名解析后的多 IP 归属地查询。默认返回 JSON，JSONP 仅用于兼容旧前端页面。Base URL：<code className="cnp-docs-base">{DOCS_BASE}</code></p>
        <div className="cnp-docs-tabs">
          {endpoints.map((ep, index) => (
            <button key={ep.path + ep.title} className={`cnp-docs-tab ${active === index ? 'active' : ''}`} type="button" onClick={() => switchTab(index)}>
              <span className="cnp-docs-tab-method">{ep.method}</span>{ep.title}
            </button>
          ))}
        </div>
        <div className="cnp-docs-detail">
          <div className="cnp-docs-endpoint-bar"><span className="cnp-docs-method-badge">{endpoint.method}</span><code className="cnp-docs-path">{DOCS_BASE}{endpoint.path}</code></div>
          <p className="cnp-docs-desc">{endpoint.desc}</p>
          <div className="cnp-docs-params"><span className="cnp-docs-params-label">返回类型</span><div className="cnp-docs-param-row"><code>{endpoint.category}</code><span>{endpoint.responseType === 'json' ? 'JSON' : 'JSONP / Text'}</span></div></div>
          {endpoint.params.length > 0 && (
            <div className="cnp-docs-params">
              <span className="cnp-docs-params-label">参数</span>
              {endpoint.params.map((param) => <div className="cnp-docs-param-row" key={param.name}><code>{param.name}</code>{param.required && <span className="cnp-docs-required">required</span>}<span>{param.location}</span><span>{param.desc}</span></div>)}
            </div>
          )}
          <form onSubmit={run}>
            <div className="cnp-docs-curl">
              <span className="cnp-docs-params-label">请求示例</span>
              <div className="cnp-docs-curl-box"><code>{curl}</code><button className="cnp-docs-runner-btn" type="submit" disabled={runner.isPending} title="Run" aria-label="Run">{runner.isPending ? <RunnerSpinner /> : <RunIcon />}</button></div>
            </div>
            <div className="cnp-docs-runner">
              {endpoint.params.length > 0 && (
                <div className="cnp-docs-params">
                  {endpoint.params.map((param) => (
                    <div className="cnp-docs-runner-input-wrap" key={param.name}>
                      <input className="cnp-docs-runner-input" value={values[param.name] || ''} placeholder={param.placeholder || param.desc} onChange={(event) => setValues((prev) => ({ ...prev, [param.name]: event.target.value }))} />
                    </div>
                  ))}
                </div>
              )}
              {(output || error) && (
                <div className="cnp-docs-runner-output">
                  {output && <div className="cnp-docs-runner-meta"><span className={output.status < 400 ? 'cnp-status-ok' : 'cnp-status-err'}>{output.status} {output.status === 200 ? 'OK' : 'Error'}</span><span>{output.ms}ms</span><span className="cnp-docs-runner-type">{output.type}</span></div>}
                  <pre className={`cnp-docs-runner-code cnp-json ${error ? 'cnp-json-err' : ''}`}>{error || output?.text}</pre>
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="cnp-docs-subdomains">
          <span className="cnp-docs-params-label">快速上手</span>
          {quickExamples.map((example, index) => {
            const key = `quick-${index}`
            return <div className="cnp-docs-subdomain-row" key={example.cmd}><p className="cnp-docs-example-label">{example.label}</p><div className="cnp-docs-curl-box cnp-docs-curl-sm"><code>{example.cmd}</code><button className={`cnp-docs-copy-btn ${copiedKey === key ? 'copied' : ''}`} type="button" onClick={() => copy(example.cmd, key)} title="Copy" aria-label="Copy">{copiedKey === key ? '✓' : <CopyIcon />}</button></div></div>
          })}
        </div>
      </div>
    </section>
  )
}
