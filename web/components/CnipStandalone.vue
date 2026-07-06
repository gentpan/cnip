<script setup lang="ts">
import faviconUrl from '~/assets/favicon.ico?url'
import logoUrl from '~/assets/logo.svg?url'
import '~/assets/css/cnip.css'

const currentYear = new Date().getFullYear()
const config = useRuntimeConfig()
const query = ref('')
const cnipMenuOpen = ref(false)
const { pending, error, data, lookup } = useLookup()
const enhance = useEnhance()
const meta = useMeta()

const submit = async () => {
  if (!query.value.trim()) return
  enhance.reset()
  await lookup(query.value)
}

const formatCreatedDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai'
  }).format(date)
}

const latestDatabaseLabel = computed(() => {
  const databases = meta.data.value?.databases || []
  if (!databases.length) return '数据库版本读取中'

  const latest = [...databases]
    .filter(item => item.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt)[0]

  if (!latest) return '数据库版本待同步'
  return `${latest.family.toUpperCase()} ${formatCreatedDate(latest.createdDate)}`
})

const lookupFieldGroups = [
  { key: 'continent', label: '洲', icon: '/icons/globe-with-meridians.svg' },
  { key: 'country', label: '国家', icon: '/icons/world-map.svg' },
  { key: 'province', label: '省份', icon: '/icons/pushpin.svg' },
  { key: 'city', label: '城市', icon: '/icons/cityscape.svg' },
  { key: 'district', label: '区县', icon: '/icons/cityscape-at-dusk.svg' },
  { key: 'isp', label: '运营商', icon: '/icons/satellite-antenna.svg' },
  { key: 'longitude', label: '经度', icon: '/icons/compass.svg' },
  { key: 'latitude', label: '纬度', icon: '/icons/compass.svg' },
  { key: 'areaCode', label: '行政区码', icon: '/icons/antenna-bars.svg' },
  { key: 'cityCode', label: '城市区号', icon: '/icons/telephone-receiver.svg' },
  { key: 'zipCode', label: '邮编', icon: '/icons/mailbox.svg' },
  { key: 'timeZone', label: '时区', icon: '/icons/clock.svg' },
  { key: 'currency', label: '货币', icon: '/icons/ip-stamp.svg' },
  { key: 'asn', label: 'ASN', icon: '/icons/paperclip.svg' },
  { key: 'elevation', label: '海拔', icon: '/icons/mountain.svg' },
  { key: 'weatherStation', label: '气象站', icon: '/icons/sun-behind-cloud.svg' },
  { key: 'countryChar', label: '国家简称', icon: '/icons/globe-with-meridians.svg' }
] as const

const enhanceFieldGroups = [
  { key: 'org', label: '组织', icon: '/icons/skyscrapers.svg' },
  { key: 'asname', label: 'AS 名称', icon: '/icons/antenna-bars.svg' },
  { key: 'reverse', label: '反向解析', icon: '/icons/compass.svg' },
  { key: 'mobile', label: '移动网络', icon: '/icons/telephone-receiver.svg' },
  { key: 'proxy', label: '代理', icon: '/icons/shield.svg' },
  { key: 'hosting', label: '托管', icon: '/icons/cityscape-at-dusk.svg' }
] as const

const resolveLookupValue = (item: Record<string, string>, key: string) => {
  if (key === 'countryChar') return item.countryChar || item.isoCode || '-'
  return item[key] || '-'
}

const resolveEnhanceValue = (item: Record<string, unknown>, key: string) => {
  const value = item[key]
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'string' && value.trim()) return value
  return '-'
}

const openMenu = () => {
  cnipMenuOpen.value = true
}

const closeMenu = () => {
  cnipMenuOpen.value = false
}

const handleWindowClick = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('.cnp-nav-wrap')) return
  cnipMenuOpen.value = false
}

onMounted(async () => {
  await meta.load()

  if (!query.value.trim()) {
    try {
      const self = await $fetch<{ ip: string }>('/api/v1/self', {
        baseURL: config.public.apiBase || undefined
      })

      if (self?.ip) {
        query.value = self.ip
        await lookup(self.ip)
      }
    } catch {
      // Keep the page usable even if IP autodetect is unavailable.
    }
  }

  window.addEventListener('click', handleWindowClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleWindowClick)
})

useHead({
  title: 'cnip.io 中文 IP 查询',
  link: [
    { rel: 'icon', type: 'image/x-icon', href: faviconUrl }
  ],
  meta: [
    {
      name: 'description',
      content: 'cnip.io 是一个面向中文用户的 IP 归属地查询站点，支持 IPv4、IPv6、域名解析与本地 ip2region 数据查询。'
    }
  ]
})

watch(data, async (value) => {
  if (!value?.results?.length) return
  for (const item of value.results) {
    if (!item.ip) continue
    if (enhance.data.value[item.ip] || enhance.pending.value[item.ip]) continue
    await enhance.load(item.ip)
  }
})
</script>

<template>
  <main class="cnp-page">
    <section class="cnp-nav-wrap">
      <header class="cnp-nav" :class="{ 'cnp-nav-open': cnipMenuOpen }">
        <div class="cnp-nav-bar">
          <a class="cnp-nav-brand" href="/" aria-label="cnip.io 首页">
            <img class="cnp-nav-logo-image" :src="logoUrl" alt="cnip.io">
          </a>

          <nav class="cnp-nav-links">
            <div class="cnp-nav-menu" @mouseenter="openMenu" @mouseleave="closeMenu">
              <button type="button" class="cnp-nav-link-active" :aria-expanded="cnipMenuOpen" aria-haspopup="true">
                查询
              </button>
            </div>
            <a href="#footer">关于</a>
          </nav>

          <a class="cnp-nav-cta" href="/api/v1/meta" target="_blank" rel="noreferrer">API</a>
        </div>

        <transition name="cnp-dropdown">
          <div v-if="cnipMenuOpen" class="cnp-nav-dropdown">
            <a class="cnp-nav-panel-card cnp-card-red" href="#query" @click="closeMenu">
              <span class="cnp-nav-panel-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>
                  <path d="M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 4C14.8 6.4 16.4 9.1 16.4 12C16.4 14.9 14.8 17.6 12 20C9.2 17.6 7.6 14.9 7.6 12C7.6 9.1 9.2 6.4 12 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
              </span>
              <strong>IP地理信息</strong>
              <span>按本地 ip2region 高级版返回洲、国家、省市区与坐标信息。</span>
            </a>
            <a class="cnp-nav-panel-card cnp-card-purple" href="#results" @click="closeMenu">
              <span class="cnp-nav-panel-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 6.5C9 4.6 10.6 3 12.5 3C14 3 15.2 3.8 15.8 5C17.7 5 19.3 6.6 19.3 8.5C20.3 9.2 21 10.4 21 11.8C21 13.2 20.3 14.4 19.3 15.1V15.5C19.3 17.4 17.7 19 15.8 19H8.8C6.7 19 5 17.3 5 15.2C3.8 14.5 3 13.3 3 11.8C3 10.3 3.9 9 5.2 8.4C5.7 6.7 7.2 5.5 9 5.5V6.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M9.5 10V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12.5 9V15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M15.5 10V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <strong>网络归属分析</strong>
              <span>补充组织、AS 名称、代理、托管与移动网络属性判断。</span>
            </a>
            <a class="cnp-nav-panel-card cnp-card-amber" href="#results" @click="closeMenu">
              <span class="cnp-nav-panel-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" stroke-width="2"/>
                  <path d="M15 15L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M8.5 10.5H12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <strong>IP基本属性</strong>
              <span>集中展示 ASN、行政区码、邮编、时区、海拔与气象站字段。</span>
            </a>
            <a class="cnp-nav-panel-card cnp-card-rose" href="#results" @click="closeMenu">
              <span class="cnp-nav-panel-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 8.5C4 7.1 5.1 6 6.5 6H9.5L11 4H17.5C18.9 4 20 5.1 20 6.5V15.5C20 16.9 18.9 18 17.5 18H6.5C5.1 18 4 16.9 4 15.5V8.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M7 12H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M9 9.5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <strong>域名与网络信息</strong>
              <span>支持域名展开 A / AAAA 记录，并异步补充反向解析与网络信息。</span>
            </a>
          </div>
        </transition>
      </header>
    </section>

    <section id="query" class="cnp-hero">
      <div class="cnp-hero-copy">
        <p class="cnp-eyebrow">IP LOOKUP</p>
        <h1>查询你的 IP 信息</h1>
        <p class="cnp-intro">自动识别真实访客 IP，也支持手动输入 IPv4、IPv6 或域名。</p>
      </div>

      <form class="cnp-search-panel" @submit.prevent="submit">
        <div class="cnp-search-shell">
          <span class="cnp-search-light" aria-hidden="true"></span>
          <div class="cnp-search-icon" aria-hidden="true">
            <svg class="echo" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
            <svg class="echo" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
            <svg class="echo" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
            <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
          </div>
          <input
            id="cnip-query"
            v-model="query"
            class="cnp-query-input"
            type="text"
            placeholder="例如 114.114.114.114 / 2400:3200::1 / cnip.io"
            autocomplete="off"
            spellcheck="false"
          >
          <button class="cnp-query-button" type="submit" :disabled="pending">
            <span v-if="pending">查询中</span>
            <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V6.8C21 7.33 20.79 7.84 20.41 8.21L14.59 14.03C14.21 14.4 14 14.91 14 15.44V18L10 21V15.44C10 14.91 9.79 14.4 9.41 14.03L3.59 8.21C3.21 7.84 3 7.33 3 6.8V5Z"></path>
            </svg>
          </button>
        </div>
      </form>
    </section>

    <section class="cnp-examples">
      <button v-for="item in ['114.114.114.114', '2400:3200::1', 'cnip.io']" :key="item" type="button" class="cnp-example-chip" @click="query = item">
        {{ item }}
      </button>
    </section>

    <section v-if="error" class="cnp-status-card cnp-error-card">
      <p>{{ error }}</p>
    </section>

    <section v-if="data" id="results" class="cnp-results-section">
      <header class="cnp-results-header">
        <div>
          <p class="cnp-eyebrow">查询结果</p>
          <h2>{{ data.query }}</h2>
        </div>
        <div class="cnp-query-pill">{{ data.queryType }}</div>
      </header>

      <div v-if="data.resolvedIps?.length && data.queryType === 'domain'" class="cnp-resolved-box">
        <div class="cnp-resolved-head">
          <strong>域名解析结果</strong>
          <span>{{ data.resolvedIps.length }} 条记录</span>
        </div>
        <div class="cnp-resolved-table">
          <div class="cnp-resolved-row cnp-resolved-row-head"><span>IP 地址</span><span>类型</span></div>
          <div v-for="ip in data.resolvedIps" :key="ip" class="cnp-resolved-row">
            <code>{{ ip }}</code>
            <span>{{ ip.includes(':') ? 'IPv6' : 'IPv4' }}</span>
          </div>
        </div>
      </div>

      <div class="cnp-result-list">
        <article v-for="item in data.results" :key="item.ip" class="cnp-result-card">
          <div class="cnp-result-title-row">
            <h3>{{ item.ip }}</h3>
            <span class="cnp-family-badge">{{ item.family }}</span>
          </div>

          <div class="cnp-enhance-card">
            <div class="cnp-enhance-head"><strong>异步增强信息</strong></div>
            <div v-if="enhance.pending[item.ip]" class="cnp-enhance-status">正在补充网络属性信息...</div>
            <div v-else-if="enhance.error[item.ip]" class="cnp-enhance-status">{{ enhance.error[item.ip] }}</div>
            <div v-else-if="enhance.data[item.ip]" class="cnp-enhance-grid">
              <div v-for="field in enhanceFieldGroups" :key="field.key" class="cnp-result-row cnp-result-row-icon">
                <div class="cnp-result-meta">
                  <span class="cnp-result-icon"><img :src="field.icon" alt="" aria-hidden="true"></span>
                  <span class="cnp-result-label">{{ field.label }}</span>
                </div>
                <span class="cnp-result-value">{{ resolveEnhanceValue(enhance.data[item.ip] as unknown as Record<string, unknown>, field.key) }}</span>
              </div>
            </div>
          </div>

          <div class="cnp-result-table">
            <div v-for="field in lookupFieldGroups" :key="field.key" class="cnp-result-row cnp-result-row-icon">
              <div class="cnp-result-meta">
                <span class="cnp-result-icon"><img :src="field.icon" alt="" aria-hidden="true"></span>
                <span class="cnp-result-label">{{ field.label }}</span>
              </div>
              <span class="cnp-result-value">{{ resolveLookupValue(item as unknown as Record<string, string>, field.key) }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <footer id="footer" class="cnp-footer">
      <strong>© {{ currentYear }} cnip.io 版权所有</strong>
      <span>数据库版本与更新时间：{{ latestDatabaseLabel }}</span>
    </footer>
  </main>
</template>
