<script setup lang="ts">
type ParamLocation = 'path' | 'query' | 'header'
type ResponseType = 'json' | 'text'

type EndpointParam = {
  name: string
  required: boolean
  desc: string
  location: ParamLocation
  placeholder?: string
  defaultValue?: string
}

type Endpoint = {
  method: 'GET'
  path: string
  title: string
  desc: string
  category: string
  responseType: ResponseType
  params: EndpointParam[]
  buildUrl: (values: Record<string, string>) => string
  buildCurl: (values: Record<string, string>) => string
}

const BASE = 'https://api.ip2region.io'

const endpoints: Endpoint[] = [
  {
    method: 'GET',
    path: '/geoip',
    title: 'GeoIP / 当前访客',
    desc: '自动识别当前请求来源 IP，返回扁平结构的国家、地区、城市、时区、坐标、ASN、ISP 等信息。',
    category: 'GeoIP',
    responseType: 'json',
    params: [],
    buildUrl: () => `${BASE}/geoip`,
    buildCurl: () => `curl "${BASE}/geoip"`
  },
  {
    method: 'GET',
    path: '/geoip/{ip}',
    title: 'GeoIP / 指定 IP',
    desc: '查询指定 IPv4 或 IPv6 地址。IPv6 会自动 URL 编码，方便直接在线测试。',
    category: 'GeoIP',
    responseType: 'json',
    params: [
      { name: 'ip', required: true, desc: 'IPv4 或 IPv6 地址', location: 'path', placeholder: '例如 8.8.8.8 或 2a09::', defaultValue: '8.8.8.8' }
    ],
    buildUrl: values => `${BASE}/geoip/${encodeURIComponent((values.ip || '').trim())}`,
    buildCurl: values => `curl "${BASE}/geoip/${encodeURIComponent((values.ip || '').trim())}"`
  },
  {
    method: 'GET',
    path: '/geoip/{ip}?callback={callback}',
    title: 'GeoIP / JSONP',
    desc: '查询指定 IP 并通过 callback 返回 JSONP，适合旧站点通过 script 标签直接接入。',
    category: 'GeoIP',
    responseType: 'text',
    params: [
      { name: 'ip', required: true, desc: 'IPv4 或 IPv6 地址', location: 'path', placeholder: '例如 8.8.8.8', defaultValue: '8.8.8.8' },
      { name: 'callback', required: true, desc: 'JSONP 回调函数名', location: 'query', placeholder: '例如 getgeoip', defaultValue: 'getgeoip' }
    ],
    buildUrl: values => `${BASE}/geoip/${encodeURIComponent((values.ip || '').trim())}?callback=${encodeURIComponent((values.callback || '').trim())}`,
    buildCurl: values => `curl "${BASE}/geoip/${encodeURIComponent((values.ip || '').trim())}?callback=${encodeURIComponent((values.callback || '').trim())}"`
  },
  {
    method: 'GET',
    path: '/healthz',
    title: '服务健康检查',
    desc: '返回最小健康状态，用于监控探活或反向代理自检。',
    category: 'System',
    responseType: 'json',
    params: [],
    buildUrl: () => `${BASE}/healthz`,
    buildCurl: () => `curl "${BASE}/healthz"`
  },
  {
    method: 'GET',
    path: '/',
    title: '访客 IP / JSON',
    desc: '返回当前请求者的真实 IP，仅返回 ip 字段。',
    category: 'System',
    responseType: 'json',
    params: [],
    buildUrl: () => `${BASE}/`,
    buildCurl: () => `curl "${BASE}/"`
  },
  {
    method: 'GET',
    path: '/lookup?q={q}',
    title: 'Lookup / IP 或域名',
    desc: '传统查询接口，支持 IPv4、IPv6、域名输入。域名会先解析 A/AAAA 记录，再返回多结果结构。',
    category: 'Lookup',
    responseType: 'json',
    params: [
      { name: 'q', required: true, desc: 'IP 地址或域名', location: 'query', placeholder: '例如 8.8.8.8 或 ip2region.io', defaultValue: '8.8.8.8' }
    ],
    buildUrl: values => `${BASE}/lookup?q=${encodeURIComponent((values.q || '').trim())}`,
    buildCurl: values => `curl "${BASE}/lookup?q=${encodeURIComponent((values.q || '').trim())}"`
  }
]

const quickExamples = [
  `curl "${BASE}/geoip"`,
  `curl "${BASE}/geoip/8.8.8.8"`,
  `curl "${BASE}/geoip/2a09%3A%3A?callback=getgeoip"`,
  `curl "${BASE}/"`,
  `curl "${BASE}/lookup?q=ip2region.io"`
]

const activeTab = ref(0)
const running = ref(false)
const resultJson = ref<any>(null)
const resultText = ref('')
const resultError = ref('')
const responseTime = ref(0)
const responseStatus = ref(0)
const responseTypeLabel = ref('application/json')
const paramValues = ref<Record<string, string>>({})
const copiedKey = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const endpoint = computed(() => endpoints[activeTab.value])

const syntaxHighlight = (json: string): string => {
  return json.replace(
    /("(?:[^"\\]|\\.)*")\s*:/g,
    '<span class="json-key">$1</span>:'
  ).replace(
    /:\s*("(?:[^"\\]|\\.)*")/g,
    ': <span class="json-str">$1</span>'
  ).replace(
    /:\s*(-?\d+\.?\d*)/g,
    ': <span class="json-num">$1</span>'
  ).replace(
    /:\s*(true|false)/g,
    ': <span class="json-bool">$1</span>'
  ).replace(
    /:\s*(null)/g,
    ': <span class="json-null">$1</span>'
  )
}

const highlightedResult = computed(() => {
  if (!resultJson.value) return ''
  return syntaxHighlight(JSON.stringify(resultJson.value, null, 2))
})

const currentCurl = computed(() => endpoint.value.buildCurl(paramValues.value))

const resetRunner = () => {
  resultJson.value = null
  resultText.value = ''
  resultError.value = ''
  responseStatus.value = 0
  responseTime.value = 0
  responseTypeLabel.value = endpoint.value.responseType === 'json' ? 'application/json' : 'text/plain'
}

const initParams = (idx: number) => {
  const values: Record<string, string> = {}
  for (const param of endpoints[idx].params) {
    values[param.name] = param.defaultValue || ''
  }
  paramValues.value = values
  resetRunner()
}

const validateParams = () => {
  for (const param of endpoint.value.params) {
    const value = (paramValues.value[param.name] || '').trim()
    if (param.required && !value) {
      resultError.value = `参数 ${param.name} 必填`
      return false
    }
  }

  return true
}

const run = async () => {
  if (!validateParams()) {
    resultJson.value = null
    resultText.value = ''
    responseStatus.value = 0
    responseTime.value = 0
    return
  }

  running.value = true
  resetRunner()

  const start = performance.now()
  try {
    const res = await fetch(endpoint.value.buildUrl(paramValues.value))
    responseTime.value = Math.round(performance.now() - start)
    responseStatus.value = res.status
    responseTypeLabel.value = res.headers.get('content-type')?.split(';')[0] || (endpoint.value.responseType === 'json' ? 'application/json' : 'text/plain')

    if (endpoint.value.responseType === 'text') {
      resultText.value = await res.text()
    }
    else {
      resultJson.value = await res.json()
    }
  } catch (e: any) {
    responseTime.value = Math.round(performance.now() - start)
    responseStatus.value = 0
    resultError.value = e.message
    responseTypeLabel.value = endpoint.value.responseType === 'json' ? 'application/json' : 'text/plain'
  } finally {
    running.value = false
  }
}

const switchTab = (idx: number) => {
  activeTab.value = idx
  initParams(idx)
}

const copyText = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copiedKey.value = ''
    }, 1600)
  }
  catch {}
}

initParams(0)
</script>

<template>
  <section class="cnp-view-page">
    <div class="cnp-view-card cnp-docs">
      <h2>API</h2>
      <p class="cnp-docs-intro">
        这个页面现在是完整的 API 调试台。公开接口都可以直接运行，带参数的接口可以输入 IP、IPv6、域名或 callback 进行测试。Base URL:
        <code class="cnp-docs-base">{{ BASE }}</code>
      </p>

      <div class="cnp-docs-tabs">
        <button
          v-for="(ep, idx) in endpoints"
          :key="`${ep.category}-${ep.path}`"
          class="cnp-docs-tab"
          :class="{ active: activeTab === idx }"
          @click="switchTab(idx)"
        >
          <span class="cnp-docs-tab-method">{{ ep.method }}</span>
          {{ ep.title }}
        </button>
      </div>

      <div class="cnp-docs-detail">
        <div class="cnp-docs-endpoint-bar">
          <span class="cnp-docs-method-badge">{{ endpoint.method }}</span>
          <code class="cnp-docs-path">{{ BASE }}{{ endpoint.path }}</code>
        </div>

        <p class="cnp-docs-desc">{{ endpoint.desc }}</p>

        <div class="cnp-docs-params">
          <span class="cnp-docs-params-label">Category</span>
          <div class="cnp-docs-param-row">
            <code>{{ endpoint.category }}</code>
            <span>{{ endpoint.responseType === 'json' ? 'JSON Response' : 'Text Response' }}</span>
          </div>
        </div>

        <div v-if="endpoint.params.length" class="cnp-docs-params">
          <span class="cnp-docs-params-label">Parameters</span>
          <div v-for="param in endpoint.params" :key="param.name" class="cnp-docs-param-row">
            <code>{{ param.name }}</code>
            <span v-if="param.required" class="cnp-docs-required">required</span>
            <span>{{ param.location }}</span>
            <span>{{ param.desc }}</span>
          </div>
        </div>

        <div class="cnp-docs-curl">
          <span class="cnp-docs-params-label">cURL</span>
          <div class="cnp-docs-curl-box">
            <code>{{ currentCurl }}</code>
            <button class="cnp-docs-copy-btn" :title="copiedKey === 'curl' ? '复制成功' : '复制'" @click="copyText(currentCurl, 'curl')">
              <span v-if="copiedKey === 'curl'" class="cnp-docs-copy-state">已复制</span>
              <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
            <button class="cnp-docs-runner-btn" :disabled="running" @click="run">
              <svg v-if="running" class="cnp-docs-spinner" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
              <template v-else>
                <svg viewBox="0 0 24 24" fill="none"><polygon points="6,3 20,12 6,21" fill="currentColor"/></svg>
                Run
              </template>
            </button>
          </div>
        </div>

        <div class="cnp-docs-runner">
          <div v-if="endpoint.params.length" class="cnp-docs-params">
            <div
              v-for="param in endpoint.params"
              :key="`input-${param.name}`"
              class="cnp-docs-runner-input-wrap"
            >
              <input
                v-model="paramValues[param.name]"
                class="cnp-docs-runner-input"
                type="text"
                :placeholder="param.placeholder || param.desc"
                @keydown.enter="run"
              >
            </div>
          </div>

          <div v-if="resultJson || resultText || resultError || running" class="cnp-docs-runner-output">
            <div class="cnp-docs-runner-meta">
              <span v-if="responseStatus" :class="responseStatus < 400 ? 'cnp-status-ok' : 'cnp-status-err'">{{ responseStatus }} {{ responseStatus === 200 ? 'OK' : 'Error' }}</span>
              <span v-if="responseTime">{{ responseTime }}ms</span>
              <span class="cnp-docs-runner-type">{{ responseTypeLabel }}</span>
            </div>
            <pre v-if="running" class="cnp-docs-runner-code cnp-json">Loading...</pre>
            <pre v-else-if="resultError" class="cnp-docs-runner-code cnp-json cnp-json-err">{{ resultError }}</pre>
            <pre v-else-if="resultText" class="cnp-docs-runner-code cnp-json">{{ resultText }}</pre>
            <pre v-else class="cnp-docs-runner-code cnp-json" v-html="highlightedResult"></pre>
          </div>
        </div>
      </div>

      <div class="cnp-docs-subdomains">
        <span class="cnp-docs-params-label">Quick Examples</span>
        <p class="cnp-docs-desc">这些命令可以直接复制验证，也可以切换上面的接口标签后在线跑。</p>
        <div v-for="example in quickExamples" :key="example" class="cnp-docs-subdomain-row">
          <div class="cnp-docs-curl-box cnp-docs-curl-sm">
            <code>{{ example }}</code>
            <button class="cnp-docs-copy-btn" :title="copiedKey === example ? '复制成功' : '复制'" @click="copyText(example, example)">
              <span v-if="copiedKey === example" class="cnp-docs-copy-state">已复制</span>
              <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
