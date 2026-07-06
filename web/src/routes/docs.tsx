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
    desc: '统一查询入口。q 可以是 IPv4、IPv6 或域名；输入域名时会先解析 DNS，再返回 resolvedIps 和每个 IP 对应的归属地结果。resolver 可指定 cloudflare、system、google、aliyun 或 tencent。',
    category: 'Lookup',
    responseType: 'json',
    params: [
      { name: 'q', required: true, desc: 'IP 地址或域名', location: 'query', placeholder: '例如 114.114.114.114 或 baidu.com', defaultValue: 'baidu.com' },
      { name: 'resolver', required: false, desc: '域名解析源：cloudflare / system / google / aliyun / tencent', location: 'query', placeholder: '例如 cloudflare', defaultValue: 'cloudflare' },
    ],
    buildUrl: (values, base = DOCS_BASE) => {
      const params = new URLSearchParams({ q: (values.q || '').trim() })
      const resolver = (values.resolver || '').trim()
      if (resolver && resolver !== 'cloudflare') params.set('resolver', resolver)
      return `${base}/lookup?${params.toString()}`
    },
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

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

function Docs() {
  const [active, setActive] = useState(0)
  const endpoint = endpoints[active]
  const [values, setValues] = useState<Record<string, string>>(() => makeInitialValues(endpoint))
  const [output, setOutput] = useState<{ status: number; ms: number; type: string; text: string; isJson: boolean } | null>(null)
  const [error, setError] = useState('')
  const curl = useMemo(() => `curl "${endpoint.buildUrl(values)}"`, [endpoint, values])

  const runner = useMutation({
    mutationFn: async () => {
      const start = performance.now()
      const res = await fetch(endpoint.buildUrl(values, DOCS_REQUEST_BASE))
      const type = res.headers.get('content-type')?.split(';')[0] || (endpoint.responseType === 'json' ? 'application/json' : 'text/plain')
      const text = endpoint.responseType === 'json' ? JSON.stringify(await res.json(), null, 2) : await res.text()
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
              <div className="cnp-docs-curl-box"><code>{curl}</code><button className="cnp-docs-copy-btn" type="button" onClick={() => copy(curl)} title="复制">复制</button><button className="cnp-docs-runner-btn" type="submit" disabled={runner.isPending}>{runner.isPending ? 'Running' : 'Run'}</button></div>
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
          <p className="cnp-docs-desc">以下命令可以直接复制到终端。<code>api.cnip.io</code> 返回 JSON；<code>v4.cnip.io</code> 和 <code>v6.cnip.io</code> 分别用于强制测试 IPv4 / IPv6 出口，根路径返回纯文本，<code>/json</code> 返回 JSON。</p>
          {quickExamples.map((example) => <div className="cnp-docs-subdomain-row" key={example.cmd}><p className="cnp-docs-example-label">{example.label}</p><div className="cnp-docs-curl-box cnp-docs-curl-sm"><code>{example.cmd}</code><button className="cnp-docs-copy-btn" type="button" onClick={() => copy(example.cmd)} title="复制">复制</button></div></div>)}
        </div>
      </div>
    </section>
  )
}
