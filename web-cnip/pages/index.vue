<script setup lang="ts">
import logoUrl from '~/assets/logo.svg?url'
import type mapboxgl from 'mapbox-gl'

import iconPaperclip from '~/assets/icons/paperclip.svg?url'
import iconSatellite from '~/assets/icons/satellite-antenna.svg?url'
import iconGlobe from '~/assets/icons/globe-with-meridians.svg?url'
import iconEurope from '~/assets/icons/europe-africa.svg?url'
import iconPushpin from '~/assets/icons/pushpin.svg?url'
import iconCityscape from '~/assets/icons/cityscape.svg?url'
import iconMailbox from '~/assets/icons/mailbox.svg?url'
import iconCityscapeDusk from '~/assets/icons/cityscape-at-dusk.svg?url'
import iconCompass from '~/assets/icons/compass.svg?url'
import iconClock from '~/assets/icons/clock.svg?url'
import iconAntenna from '~/assets/icons/antenna-bars.svg?url'
import iconPhone from '~/assets/icons/telephone-receiver.svg?url'
import iconMountain from '~/assets/icons/mountain.svg?url'
import iconSun from '~/assets/icons/sun-behind-cloud.svg?url'
import iconAsiaAustralia from '~/assets/icons/asia-australia.svg?url'

const iconMap: Record<string, string> = {
  paperclip: iconPaperclip, 'satellite-antenna': iconSatellite,
  'globe-with-meridians': iconGlobe, 'europe-africa': iconEurope,
  pushpin: iconPushpin, cityscape: iconCityscape, mailbox: iconMailbox,
  'cityscape-at-dusk': iconCityscapeDusk, compass: iconCompass, clock: iconClock,
  'antenna-bars': iconAntenna, 'telephone-receiver': iconPhone,
  mountain: iconMountain, 'sun-behind-cloud': iconSun,
  'asia-australia': iconAsiaAustralia
}

const currentYear = new Date().getFullYear()
const config = useRuntimeConfig()
const query = ref('')
const selfIps = reactive<{ v4: string; v6: string; active: 'v4' | 'v6' }>({ v4: '', v6: '', active: 'v4' })
const currentView = ref<'lookup' | 'about' | 'docs'>('lookup')
const menuOpen = ref(false)
const manualQuery = ref(false)
const cookieAccepted = ref(import.meta.client ? !!localStorage.getItem('cnip-cookie-ok') : true)

const acceptCookies = () => {
  cookieAccepted.value = true
  localStorage.setItem('cnip-cookie-ok', '1')
}

const setView = (view: 'lookup' | 'about' | 'docs') => {
  currentView.value = view
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const hardReloadHome = () => {
  if (!import.meta.client) return
  if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
    window.location.href = '/'
    return
  }
  window.location.reload()
}

if (import.meta.client) {
  const path = window.location.pathname
  if (path === '/about') currentView.value = 'about'
  else if (path === '/docs') currentView.value = 'docs'

  window.addEventListener('popstate', () => {
    const p = window.location.pathname
    if (p === '/about') currentView.value = 'about'
    else if (p === '/docs') currentView.value = 'docs'
    else currentView.value = 'lookup'
  })
}
const getInitialTheme = (): 'dark' | 'light' => {
  if (import.meta.client) {
    const saved = localStorage.getItem('cnip-theme')
    if (saved === 'dark' || saved === 'light') return saved
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  }
  return 'dark'
}
const mapTheme = ref<'dark' | 'light'>(getInitialTheme())
const { pending, error, data, dbUpdatedAt, lookup, prefetchLookup } = useLookup()
const mapBaseUrl = computed(() => config.public.mapBaseUrl || 'https://mapbox.mapcdn.io')
const mapboxToken = computed(() => __MAPBOX_TOKEN__ || '')
const mapContainer = ref<HTMLElement | null>(null)
const mapboxLib = shallowRef<typeof import('mapbox-gl').default | null>(null)
const map = shallowRef<mapboxgl.Map | null>(null)
const mapMarker = shallowRef<mapboxgl.Marker | null>(null)

const mapStyle = computed(() =>
  mapTheme.value === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'
)

const submit = async () => {
  if (!query.value.trim()) return
  manualQuery.value = true
  await lookup(query.value)
  manualQuery.value = false
}

const formatFooterUpdatedAt = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const footerUpdatedLabel = computed(() => {
  const updatedAt = formatFooterUpdatedAt(dbUpdatedAt.value)
  return updatedAt ? `IP 库最后更新：${updatedAt}` : 'IP 库最后更新读取中'
})

const primaryResult = computed(() => data.value?.results?.[0] || null)

const getFlagAssetUrl = (code: string) => {
  const normalized = code.toLowerCase()
  if (!normalized || normalized === '-') return ''
  return `https://flagcdn.io/flags/4x3/${normalized}.svg`
}

const mapPoint = computed(() => {
  const item = primaryResult.value as Record<string, string> | null
  if (!item) return null

  const lat = Number(item.latitude)
  const lon = Number(item.longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  return {
    lat,
    lon,
    ip: item.ip || data.value?.query || '',
    label: [item.country, item.province, item.city].filter(Boolean).join(' ')
  }
})

const lookupFieldGroups = [
  { key: 'asn', label: 'ASN', en: 'ASN', icon: 'paperclip', desc: '自治系统编号，标识网络运营实体' },
  { key: 'isp', label: '运营商', en: 'ISP', icon: 'satellite-antenna', desc: '互联网服务提供商，如电信、联通、移动' },
  { key: 'country', label: '国家', en: 'Country', icon: 'europe-africa', desc: 'IP 归属的国家或地区' },
  { key: 'province', label: '省份', en: 'Province', icon: 'pushpin', desc: '省级行政区划，如广东省、加利福尼亚州' },
  { key: 'city', label: '城市', en: 'City', icon: 'cityscape', desc: '市级行政区划' },
  { key: 'district', label: '区县', en: 'District', icon: 'cityscape-at-dusk', desc: '区县级行政区划' },
  { key: 'areaCode', label: '行政区码', en: 'Area Code', icon: 'antenna-bars', desc: '国家标准行政区划代码' },
  { key: 'cityCode', label: '城市区号', en: 'City Code', icon: 'telephone-receiver', desc: '电话区号' },
  { key: 'zipCode', label: '邮编', en: 'Zip Code', icon: 'mailbox', desc: '邮政编码' },
  { key: 'coordinates', label: '坐标', en: 'Coordinates', icon: 'compass', desc: '地理坐标 (纬度, 经度)' },
  { key: 'elevation', label: '海拔', en: 'Elevation', icon: 'mountain', desc: '所在地海拔高度（米）' },
  { key: 'timeZone', label: '时区', en: 'Timezone', icon: 'clock', desc: 'IANA 标准时区名，如 Asia/Shanghai' },
  { key: 'weatherStation', label: '气象站', en: 'Weather Stn', icon: 'sun-behind-cloud', desc: '最近的气象观测站编码' }
] as const

const formatTimezoneValue = (tz: string) => {
  if (!tz) return '-'
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || ''
    return `${tz} (${offset})`
  } catch {
    return tz
  }
}

const formatTimezoneLocal = (tz: string) => {
  if (!tz) return ''
  try {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    return `当地时间: ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

const formatCoordinates = (item: Record<string, string>) => {
  const lat = Number(item.latitude)
  const lon = Number(item.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '-'
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`
}

const resolveLookupValue = (item: Record<string, string>, key: string) => {
  if (key === 'countryChar') return item.countryChar || item.isoCode || '-'
  if (key === 'coordinates') return formatCoordinates(item)
  if (key === 'timeZone') return formatTimezoneValue(item[key])
  return item[key] || '-'
}

const resolveRegionCode = (item: Record<string, string>) => {
  const code = (item.countryChar || item.isoCode || '').toUpperCase()
  if (code === 'CN') {
    const province = (item.province || '').toLowerCase()
    if (province === '香港' || province === 'hong kong') return 'HK'
    if (province === '澳门' || province === 'macau' || province === 'macao') return 'MO'
    if (province === '台湾' || province === 'taiwan') return 'TW'
  }
  return code
}

const getCountryFlagUrl = (item: Record<string, string>) => {
  return getFlagAssetUrl(resolveRegionCode(item))
}

const getVisibleLookupFields = (item: Record<string, string>) => {
  return lookupFieldGroups.filter((field) => {
    if (field.key === 'coordinates') {
      return Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    }
    return resolveLookupValue(item, field.key) !== '-'
  })
}

const toggleTheme = () => {
  mapTheme.value = mapTheme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('cnip-theme', mapTheme.value)
  if (map.value) {
    map.value.setStyle(mapStyle.value)
    map.value.once('style.load', () => {
      syncMapPoint()
    })
  }
}

const mapWindow = ref<HTMLElement | null>(null)

const getMapPadding = () => {
  const el = mapWindow.value
  if (!el) return { top: 0, bottom: 0, left: 0, right: 0 }

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight

  const top = Math.max(0, Math.round(rect.top))
  const bottom = Math.max(0, Math.round(vh - rect.bottom))

  return { top, bottom, left: 0, right: 0 }
}

const syncMapPoint = () => {
  if (!map.value || !mapboxLib.value) return

  const padding = getMapPadding()
  const point = mapPoint.value
  if (!point) {
    map.value.flyTo({ center: [104, 35], zoom: 2.6, padding, essential: true })
    mapMarker.value?.remove()
    mapMarker.value = null
    return
  }

  const lngLat: [number, number] = [point.lon, point.lat]
  map.value.flyTo({
    center: lngLat,
    zoom: 8.8,
    padding,
    essential: true
  })

  if (!mapMarker.value) {
    const markerNode = document.createElement('span')
    markerNode.className = 'cnp-map-pin'
    mapMarker.value = new mapboxLib.value.Marker({ element: markerNode, anchor: 'center' })
  }

  mapMarker.value.setLngLat(lngLat).addTo(map.value)
}

const initMap = async () => {
  if (!mapContainer.value || map.value || !mapboxToken.value) return

  const module = await import('mapbox-gl')
  const mapbox = module.default
  mapboxLib.value = mapbox
  mapbox.accessToken = mapboxToken.value
  mapbox.baseApiUrl = mapBaseUrl.value.replace(/\/$/, '')

  const vh = window.innerHeight
  const fillZoom = Math.ceil(Math.log2(vh / 256) * 100) / 100

  map.value = new mapbox.Map({
    container: mapContainer.value,
    style: mapStyle.value,
    center: [104, 35],
    zoom: Math.max(2.6, fillZoom),
    minZoom: fillZoom,
    attributionControl: false,
    preserveDrawingBuffer: false,
    interactive: false,
    projection: 'mercator',
    renderWorldCopies: true
  })

  // 彻底禁用鼠标追踪，防止全屏模式下的光影闪烁
  map.value.on('load', () => {
    try {
      map.value!.scrollZoom.disable()
      map.value!.dragPan.disable()
      map.value!.dragRotate.disable()
      map.value!.touchZoomRotate.disable()
      map.value!.touchPitch.disable()
      map.value!.keyboard.disable()
      map.value!.boxZoom.disable()
      map.value!.doubleClickZoom.disable()
    } catch {}
    syncMapPoint()
  })
}

const detectAlternateIp = async (currentIsV6: boolean) => {
  try {
    const url = currentIsV6 ? 'https://v4.cnip.io/' : 'https://v6.cnip.io/'
    const res = await $fetch<string | { ip?: string }>(url)
    const ip = typeof res === 'string' ? res.trim() : res?.ip?.trim()
    if (!ip) return

    const altIsV6 = ip.includes(':')
    if (currentIsV6 && !altIsV6) {
      selfIps.v4 = ip
      prefetchLookup(ip)
    } else if (!currentIsV6 && altIsV6) {
      selfIps.v6 = ip
      prefetchLookup(ip)
    }
  } catch {
    // Alternate IP detection is optional.
  }
}

const switchSelfIp = async (version: 'v4' | 'v6') => {
  const ip = version === 'v4' ? selfIps.v4 : selfIps.v6
  if (!ip) return
  selfIps.active = version
  await lookup(ip)
}

const hasBothIps = computed(() => !!(selfIps.v4 && selfIps.v6))
const isSelfQuery = computed(() => data.value?.query === selfIps.v4 || data.value?.query === selfIps.v6)

let cardFocusTimer: ReturnType<typeof setTimeout> | null = null

const scrollToResultCard = (ip: string) => {
  if (!import.meta.client) return

  const targetId = `ip-${ip.replace(/[:.]/g, '-')}`
  const target = document.getElementById(targetId)
  if (!target) return

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.remove('cnp-result-card-focus')
  void target.offsetWidth
  target.classList.add('cnp-result-card-focus')

  if (cardFocusTimer) clearTimeout(cardFocusTimer)
  cardFocusTimer = setTimeout(() => {
    target.classList.remove('cnp-result-card-focus')
    cardFocusTimer = null
  }, 1800)
}

onMounted(async () => {
  await initMap()

  if (!query.value.trim()) {
    try {
      const self = await $fetch<string | { ip?: string }>('/', {
        baseURL: config.public.apiBase || undefined
      })
      const selfIp = typeof self === 'string' ? self.trim() : self?.ip?.trim()

      if (selfIp) {
        const isV6 = selfIp.includes(':')
        if (isV6) {
          selfIps.v6 = selfIp
          selfIps.active = 'v6'
        } else {
          selfIps.v4 = selfIp
          selfIps.active = 'v4'
        }
        await lookup(selfIp)
        detectAlternateIp(isV6)
      }
    } catch {
      // Keep the page usable even if IP autodetect is unavailable.
    }
  }

})

onBeforeUnmount(() => {
  if (cardFocusTimer) clearTimeout(cardFocusTimer)
  mapMarker.value?.remove()
  map.value?.remove()
})

useHead({
  title: 'IP归属地查询 - 中国IP地址定位查询工具 | cnip.io'
})

watch(data, async () => {
  await nextTick()
  syncMapPoint()
})

watch(mapPoint, () => {
  syncMapPoint()
})
</script>

<template>
  <div class="cnp-app" :class="'cnp-theme-' + mapTheme">
    <div v-if="mapboxToken" ref="mapContainer" class="cnp-map-bg"></div>
    <div v-else class="cnp-map-bg cnp-map-bg-fallback"></div>

    <main class="cnp-page">
      <section class="cnp-nav-wrap">
        <header class="cnp-nav">
          <div class="cnp-nav-bar">
            <a class="cnp-nav-brand" href="/" aria-label="cnip.io 首页" @click.prevent="hardReloadHome">
              <img class="cnp-nav-logo-image" :src="logoUrl" alt="cnip.io">
            </a>

            <nav class="cnp-nav-links">
              <div class="cnp-nav-menu" @mouseenter="menuOpen = true" @mouseleave="menuOpen = false">
                <a href="#" class="cnp-nav-link-arrow" :class="{ 'cnp-nav-link-active': currentView === 'lookup' }" @click.prevent="setView('lookup')">查询</a>
              </div>
              <a href="#" :class="{ 'cnp-nav-link-active': currentView === 'about' }" @click.prevent="setView('about')">关于</a>
              <a href="#" :class="{ 'cnp-nav-link-active': currentView === 'docs' }" @click.prevent="setView('docs')">API</a>
            </nav>

            <form class="cnp-nav-search" @submit.prevent="setView('lookup'); submit()">
              <div class="cnp-nav-search-wrap">
                <div class="cnp-nav-search-shell">
                  <input
                    id="cnip-query"
                    v-model="query"
                    class="cnp-nav-query-input"
                    type="text"
                    placeholder="输入 IPv4、IPv6 或域名"
                    autocomplete="off"
                    spellcheck="false"
                  >
                </div>
                <button class="cnp-nav-query-button" type="submit" :disabled="pending" aria-label="开始查询">
                  <svg v-if="manualQuery && pending" class="cnp-nav-query-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity=".25"></circle>
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="7.25"></circle>
                    <line x1="16.65" x2="21" y1="16.65" y2="21"></line>
                  </svg>
                </button>
              </div>
            </form>

            <button class="cnp-theme-toggle" type="button" :aria-label="mapTheme === 'dark' ? '切换浅色地图' : '切换深色地图'" @click="toggleTheme">
              <svg v-if="mapTheme === 'dark'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <transition name="cnp-dropdown">
            <div v-show="menuOpen" class="cnp-nav-panel" @mouseenter="menuOpen = true" @mouseleave="menuOpen = false">
              <div class="cnp-panel-card">
                <svg class="cnp-panel-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M4 12H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 4C14.8 6.4 16.4 9.1 16.4 12C16.4 14.9 14.8 17.6 12 20C9.2 17.6 7.6 14.9 7.6 12C7.6 9.1 9.2 6.4 12 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
                <div class="cnp-panel-text"><strong>IP 地理信息</strong><span>国家、城市、运营商、坐标</span></div>
              </div>
              <div class="cnp-panel-card">
                <svg class="cnp-panel-icon" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15 19l3 3 4-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div class="cnp-panel-text"><strong>网络归属分析</strong><span>ASN、ISP、运营商识别</span></div>
              </div>
              <div class="cnp-panel-card">
                <svg class="cnp-panel-icon" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                <div class="cnp-panel-text"><strong>IPv4 / IPv6</strong><span>双栈检测与域名解析</span></div>
              </div>
              <div class="cnp-panel-card">
                <svg class="cnp-panel-icon" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 9h18M9 3v18" stroke="currentColor" stroke-width="1.5"/></svg>
                <div class="cnp-panel-text"><strong>开放 API</strong><span>RESTful 接口，无需认证</span></div>
              </div>
            </div>
          </transition>
        </header>
      </section>

      <template v-if="currentView === 'lookup'">
        <section ref="mapWindow" class="cnp-map-window">
          <img v-if="pending && !manualQuery" class="cnp-loading-logo" :src="logoUrl" alt="">
        </section>

        <section v-if="error" class="cnp-status-card cnp-error-card">
          <p>{{ error }}</p>
        </section>

        <section v-if="data" id="results" class="cnp-results-section">

        <div v-if="data.resolvedIps?.length > 1 && data.queryType === 'domain'" class="cnp-resolved-box">
          <div class="cnp-resolved-head">
            <strong>域名解析 · {{ data.resolvedIps.length }} 条记录</strong>
            <a class="cnp-powered-link" :href="`https://dns.nf/lookup/${data.query}?type=ALL`" target="_blank" rel="noreferrer">Powered by <span class="cnp-dns-brand">dns.nf</span></a>
          </div>
          <div class="cnp-resolved-table">
            <div class="cnp-resolved-row cnp-resolved-row-head"><span>#</span><span>IP 地址</span><span>类型</span></div>
            <div v-for="(ip, idx) in data.resolvedIps" :key="ip" class="cnp-resolved-row cnp-resolved-row-clickable" @click="scrollToResultCard(ip)">
              <span class="cnp-resolved-idx">{{ idx + 1 }}</span>
              <code>{{ ip }}</code>
              <span class="cnp-family-badge" :class="ip.includes(':') ? 'cnp-badge-v6' : 'cnp-badge-v4'">{{ ip.includes(':') ? 'IPv6' : 'IPv4' }}</span>
            </div>
          </div>
        </div>

        <div class="cnp-result-list">
          <article v-for="item in data.results" :key="item.ip" :id="'ip-' + item.ip.replace(/[:.]/g, '-')" class="cnp-result-card">
            <div class="cnp-result-title-row">
              <div class="cnp-result-title-left">
                <span v-if="isSelfQuery" class="cnp-self-tag">My IP</span>
                <div v-if="hasBothIps && isSelfQuery" class="cnp-ip-toggle">
                  <button
                    type="button"
                    class="cnp-ip-toggle-btn"
                    :class="{ active: selfIps.active === 'v4' }"
                    @click="switchSelfIp('v4')"
                  >v4</button>
                  <button
                    type="button"
                    class="cnp-ip-toggle-btn"
                    :class="{ active: selfIps.active === 'v6' }"
                    @click="switchSelfIp('v6')"
                  >v6</button>
                </div>
              </div>
              <h3>{{ item.ip }}</h3>
              <span class="cnp-family-badge" :class="item.family === 'ipv6' ? 'cnp-badge-v6' : 'cnp-badge-v4'">{{ item.family === 'ipv6' ? 'IPv6' : 'IPv4' }}</span>
            </div>

            <div class="cnp-result-table">
              <div
                v-for="field in getVisibleLookupFields(item as unknown as Record<string, string>)"
                :key="field.key"
                class="cnp-result-row cnp-result-row-icon"
              >
                <div class="cnp-result-meta">
                  <span class="cnp-result-icon">
                    <img v-if="field.key === 'country' && getCountryFlagUrl(item as unknown as Record<string, string>)" :src="getCountryFlagUrl(item as unknown as Record<string, string>)" alt="" class="cnp-icon-flag">
                    <img v-else :src="iconMap[field.icon]" alt="" class="cnp-icon-svg">
                  </span>
                  <span class="cnp-result-label">{{ field.label }}<span class="cnp-result-label-en">{{ field.en }}</span></span>
                </div>
                <span class="cnp-result-value">{{ resolveLookupValue(item as unknown as Record<string, string>, field.key) }}</span>
                <span class="cnp-result-info" :data-tip="field.key === 'timeZone' ? formatTimezoneLocal((item as unknown as Record<string, string>).timeZone) || field.desc : field.desc">?</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <footer v-if="data" id="footer" class="cnp-footer">
        <img class="cnp-footer-logo" :src="logoUrl" alt="">
        <div class="cnp-footer-pill-wrap">
          <span class="cnp-footer-pill">
            <span class="cnp-pill-item">© {{ currentYear }} cnip.io</span>
            <span class="cnp-pill-sep"></span>
            <span class="cnp-pill-item cnp-pill-db">{{ footerUpdatedLabel }}</span>
          </span>
        </div>
      </footer>
      </template>

      <ViewAbout v-if="currentView === 'about'" />
      <ViewDocs v-if="currentView === 'docs'" />
    </main>

    <transition name="cnp-cookie-fade">
      <div v-if="!cookieAccepted" class="cnp-cookie">
        <p>本站使用 Cookie 以提供更好的体验。继续使用即表示您同意我们的 Cookie 政策。</p>
        <button type="button" @click="acceptCookies">接受</button>
      </div>
    </transition>
  </div>
</template>
