import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchCurrentIp,
  fetchLookup,
  fetchText,
  flagUrl,
  formatDbDate,
  getActiveMapStyle,
  iconUrl,
  isMapPolicyReady,
  isIPv6,
  dnsResolverLabel,
  normalizeDNSResolver,
  pad2,
  tileUrlForStyle,
  DNS_RESOLVERS,
  type DNSResolverId,
  type MapStyleId,
  type LookupEntry,
  type LookupResult,
} from '@/lib/api'

declare global {
  interface Window {
    L?: any
  }
}

type LookupSearch = { q?: string }
type MapControlAction = 'pan-up' | 'pan-down' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'reset'

const fields = [
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
  { key: 'weatherStation', label: '气象站', en: 'Weather Stn', icon: 'sun-behind-cloud', desc: '最近的气象观测站编码' },
] as const

function initialDNSResolver(): DNSResolverId {
  if (typeof window === 'undefined') return 'cloudflare'
  return normalizeDNSResolver(window.localStorage.getItem('cnip-dns-resolver'))
}

function DNSResolverIcon({ id }: { id: DNSResolverId }) {
  if (id === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285f4" d="M21.6 12.23c0-.74-.07-1.46-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-2 3.02v2.62h3.24c1.9-1.75 2.98-4.32 2.98-7.55Z" />
        <path fill="#34a853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.62c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.7A10 10 0 0 0 12 22Z" />
        <path fill="#fbbc05" d="M6.41 13.8A6 6 0 0 1 6.1 12c0-.62.11-1.23.31-1.8V7.5H3.06a10 10 0 0 0 0 9l3.35-2.7Z" />
        <path fill="#ea4335" d="M12 6.08c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.96 3.02 14.69 2 12 2a10 10 0 0 0-8.94 5.5l3.35 2.7C7.2 7.84 9.4 6.08 12 6.08Z" />
      </svg>
    )
  }
  if (id === 'cloudflare') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#f48120" d="M15.4 8.8a4.5 4.5 0 0 0-8.46 1.62 3.77 3.77 0 0 0-3.44 3.75c0 .27.03.54.09.8h13.15a2.98 2.98 0 0 0-1.34-6.17Z" />
        <path fill="#faae40" d="M17.42 10.85h-.34a4.9 4.9 0 0 1 .15 1.2 4.77 4.77 0 0 1-4.77 4.77H5.04A4.85 4.85 0 0 0 8.42 18h8.99a3.58 3.58 0 1 0 0-7.15Z" />
      </svg>
    )
  }
  if (id === 'aliyun') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#ff6a00" d="M4 7.2 8.2 4h7.6L20 7.2v9.6L15.8 20H8.2L4 16.8V7.2Z" />
        <path fill="#fff" d="M7.4 8.5h9.2v2.2H7.4V8.5Zm0 4.8h9.2v2.2H7.4v-2.2Z" />
      </svg>
    )
  }
  if (id === 'tencent') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#0052d9" d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
        <path fill="#fff" d="M7.2 7.8h9.6v2.4h-3.45v6h-2.7v-6H7.2V7.8Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-13Zm3 1v11h8v-11H8Zm1.5 1.8h5v1.4h-5V8.3Zm0 3h5v1.4h-5v-1.4Zm0 3h3.2v1.4H9.5v-1.4Z" />
    </svg>
  )
}

function regionCode(item: LookupResult) {
  const code = (item.countryChar || item.isoCode || '').toUpperCase()
  if (code === 'CN') {
    const province = (item.province || '').toLowerCase()
    if (province === '香港' || province === 'hong kong') return 'HK'
    if (province === '澳门' || province === 'macau' || province === 'macao') return 'MO'
    if (province === '台湾' || province === 'taiwan') return 'TW'
  }
  return code
}

function formatCoordinates(item: LookupResult) {
  const lat = Number(item.latitude)
  const lon = Number(item.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '-'
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`
}

function formatTimezone(tz?: string) {
  if (!tz) return '-'
  try {
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value || ''
    return `${tz} (${offset})`
  } catch {
    return tz
  }
}

function formatTimezoneLocal(tz?: string) {
  if (!tz) return ''
  try {
    const now = new Date()
    const d = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    return `当地时间: ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  } catch {
    return ''
  }
}

function valueOf(item: LookupResult, key: string) {
  if (key === 'coordinates') return formatCoordinates(item)
  if (key === 'timeZone') return formatTimezone(item.timeZone)
  return String(item[key as keyof LookupResult] || '-')
}

function visibleFields(item: LookupResult) {
  return fields.filter((field) => {
    if (field.key === 'coordinates') {
      return Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    }
    return valueOf(item, field.key) !== '-'
  })
}

function cardId(ip: string) {
  return `ip-${ip.replace(/[:.]/g, '-')}`
}

function pinAnchor() {
  const mapWindow = document.getElementById('map-window')
  const mapRect = document.getElementById('map-bg')?.getBoundingClientRect()
  const windowRect = mapWindow?.getBoundingClientRect()
  const fallbackX = typeof window === 'undefined' ? 0 : window.innerWidth / 2
  const fallbackY = typeof window === 'undefined' ? 0 : Math.min(260, Math.max(180, window.innerHeight * 0.27))
  const x = mapRect ? mapRect.width / 2 : fallbackX
  if (!windowRect) return { x, y: fallbackY }
  if (windowRect.bottom < 120 || windowRect.top > window.innerHeight) {
    return { x, y: Math.max(160, window.innerHeight - 96) }
  }
  return {
    x,
    y: Math.min(window.innerHeight * 0.38, Math.max(140, windowRect.top + windowRect.height * 0.42)),
  }
}

function alignMapToPoint(map: any, point: { lat: number, lon: number }) {
  const latLng: [number, number] = [point.lat, point.lon]
  const containerPoint = map.latLngToContainerPoint(latLng)
  const anchor = pinAnchor()
  map.panBy([containerPoint.x - anchor.x, containerPoint.y - anchor.y], { animate: false })
}

function applyMapControl(map: any, action: MapControlAction, point?: { lat: number, lon: number } | null) {
  const distance = 140
  if (action === 'zoom-in') map.zoomIn(1, { animate: true })
  if (action === 'zoom-out') map.zoomOut(1, { animate: true })
  if (action === 'reset' && point) {
    map.setView([point.lat, point.lon], 10, { animate: true })
    window.setTimeout(() => alignMapToPoint(map, point), 260)
  }
  if (action === 'pan-up') map.panBy([0, -distance], { animate: true })
  if (action === 'pan-down') map.panBy([0, distance], { animate: true })
  if (action === 'pan-left') map.panBy([-distance, 0], { animate: true })
  if (action === 'pan-right') map.panBy([distance, 0], { animate: true })
}

function GridLoadingSpinner() {
  return (
    <svg className="cnp-loading-logo" fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1.5" y="1.5" rx="1" width="9" height="9">
        <animate id="spinner_M16P" begin="0;spinner_wNI2.end+0.15s" attributeName="x" dur="0.6s" values="1.5;.5;1.5" keyTimes="0;.2;1" />
        <animate begin="0;spinner_wNI2.end+0.15s" attributeName="y" dur="0.6s" values="1.5;.5;1.5" keyTimes="0;.2;1" />
        <animate begin="0;spinner_wNI2.end+0.15s" attributeName="width" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
        <animate begin="0;spinner_wNI2.end+0.15s" attributeName="height" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
      </rect>
      <rect x="13.5" y="1.5" rx="1" width="9" height="9">
        <animate begin="spinner_M16P.begin+0.15s" attributeName="x" dur="0.6s" values="13.5;12.5;13.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.15s" attributeName="y" dur="0.6s" values="1.5;.5;1.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.15s" attributeName="width" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.15s" attributeName="height" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
      </rect>
      <rect x="13.5" y="13.5" rx="1" width="9" height="9">
        <animate begin="spinner_M16P.begin+0.3s" attributeName="x" dur="0.6s" values="13.5;12.5;13.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.3s" attributeName="y" dur="0.6s" values="13.5;12.5;13.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.3s" attributeName="width" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.3s" attributeName="height" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
      </rect>
      <rect x="1.5" y="13.5" rx="1" width="9" height="9">
        <animate id="spinner_wNI2" begin="spinner_M16P.begin+0.45s" attributeName="x" dur="0.6s" values="1.5;.5;1.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.45s" attributeName="y" dur="0.6s" values="13.5;12.5;13.5" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.45s" attributeName="width" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
        <animate begin="spinner_M16P.begin+0.45s" attributeName="height" dur="0.6s" values="9;11;9" keyTimes="0;.2;1" />
      </rect>
    </svg>
  )
}

function RingLoadingSpinner() {
  return (
    <svg className="cnp-loading-logo cnp-loading-logo-ring" stroke="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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

export function LookupView({ search }: { search: LookupSearch }) {
  const queryClient = useQueryClient()
  const [selfIps, setSelfIps] = useState({ v4: '', v6: '', active: 'v4' as 'v4' | 'v6' })
  const [selectedQuery, setSelectedQuery] = useState(search.q || '')
  const [focusedIp, setFocusedIp] = useState('')
  const [focusedFlashIp, setFocusedFlashIp] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [pinPoint, setPinPoint] = useState<{ x: number, y: number } | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [dnsResolver, setDnsResolver] = useState<DNSResolverId>(() => initialDNSResolver())
  const mapRef = useRef<any>(null)
  const tileRef = useRef<any>(null)

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileRef.current = null
      }
    }
  }, [])

  const currentIpQuery = useQuery({
    queryKey: ['current-ip'],
    queryFn: fetchCurrentIp,
    enabled: !search.q,
  })

  useEffect(() => {
    if (search.q) {
      setSelectedQuery(search.q)
    }
  }, [search.q])

  useEffect(() => {
    if (!search.q && currentIpQuery.data) {
      const ip = currentIpQuery.data
      const active = isIPv6(ip) ? 'v6' : 'v4'
      setSelfIps((prev) => ({ ...prev, [active]: ip, active }))
      setSelectedQuery(ip)
    }
  }, [currentIpQuery.data, search.q])

  const lookupQuery = useQuery({
    queryKey: ['lookup', selectedQuery, dnsResolver],
    queryFn: () => fetchLookup(selectedQuery, dnsResolver),
    enabled: Boolean(selectedQuery),
  })

  const entry = lookupQuery.data as LookupEntry | undefined
  const data = entry?.response
  const primary = data?.results?.find((item) => item.ip === focusedIp) || data?.results?.[0]
  const showRingLoading = hasLoadedOnce || Boolean(search.q)

  useEffect(() => {
    if (data || lookupQuery.error) setHasLoadedOnce(true)
  }, [data, lookupQuery.error])

  useEffect(() => {
    setFocusedIp('')
  }, [selectedQuery])

  useEffect(() => {
    if (!currentIpQuery.data) return
    const currentIsV6 = isIPv6(currentIpQuery.data)
    const url = currentIsV6 ? 'https://v4.cnip.io/' : 'https://v6.cnip.io/'
    fetchText(url).then((ip) => {
      if (!ip) return
      const key = isIPv6(ip) ? 'v6' : 'v4'
      setSelfIps((prev) => ({ ...prev, [key]: ip }))
      queryClient.prefetchQuery({ queryKey: ['lookup', ip, 'system'], queryFn: () => fetchLookup(ip) })
    }).catch(() => {})
  }, [currentIpQuery.data, queryClient])

  const selectDNSResolver = (resolver: DNSResolverId) => {
    setDnsResolver(resolver)
    window.localStorage.setItem('cnip-dns-resolver', resolver)
    setFocusedIp('')
  }

  const mapPoint = useMemo(() => {
    if (!primary) return null
    const lat = Number(primary.latitude)
    const lon = Number(primary.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return { lat, lon }
  }, [primary])

  useEffect(() => {
    if (window.L || document.querySelector('script[data-leaflet]')) return
    const script = document.createElement('script')
    script.src = '/leaflet/leaflet.js'
    script.defer = true
    script.dataset.leaflet = 'true'
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = () => {
      if (cancelled || !mapPoint || mapRef.current || !window.L || !document.getElementById('map-bg') || !isMapPolicyReady()) return
      const L = window.L
      mapRef.current = L.map('map-bg', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        zoomSnap: 0,
        minZoom: 1,
        inertia: false,
        fadeAnimation: true,
        zoomAnimation: true,
      })
      mapRef.current.setView([mapPoint.lat, mapPoint.lon], 10, { animate: false })
      tileRef.current = L.tileLayer(tileUrlForStyle(getActiveMapStyle()), {
        updateWhenIdle: false,
        keepBuffer: 3,
        maxZoom: 19,
      }).addTo(mapRef.current)
      setMapReady(true)
    }
    const timer = window.setInterval(init, 80)
    init()
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [mapPoint])

  useEffect(() => {
    const onMapStyle = (event: Event) => {
      const detail = (event as CustomEvent<MapStyleId | { style: MapStyleId, theme?: 'dark' | 'light' }>).detail
      const style = typeof detail === 'string' ? detail : detail.style
      const theme = typeof detail === 'string' ? undefined : detail.theme
      tileRef.current?.setUrl(tileUrlForStyle(style, theme))
    }
    window.addEventListener('cnip-map-style-change', onMapStyle)
    return () => window.removeEventListener('cnip-map-style-change', onMapStyle)
  }, [])

  useEffect(() => {
    const onMapControl = (event: Event) => {
      const map = mapRef.current
      if (!map) return
      applyMapControl(map, (event as CustomEvent<MapControlAction>).detail, mapPoint)
    }
    window.addEventListener('cnip-map-control', onMapControl)
    return () => window.removeEventListener('cnip-map-control', onMapControl)
  }, [mapPoint])

  useEffect(() => {
    const map = mapRef.current
    if (!mapPoint) {
      if (map && tileRef.current) {
        map.removeLayer(tileRef.current)
        tileRef.current = null
      }
      setMapReady(false)
      setPinPoint(null)
      return
    }
    if (!map || !isMapPolicyReady()) return
    if (!tileRef.current) {
      tileRef.current = window.L.tileLayer(tileUrlForStyle(getActiveMapStyle()), {
        updateWhenIdle: false,
        keepBuffer: 3,
        maxZoom: 19,
      }).addTo(map)
      setMapReady(true)
    }
    const latLng: [number, number] = [mapPoint.lat, mapPoint.lon]
    const syncPin = () => {
      const point = map.latLngToContainerPoint(latLng)
      setPinPoint({ x: point.x, y: point.y })
    }
    const alignPin = () => {
      alignMapToPoint(map, mapPoint)
      syncPin()
    }
    map.setView(latLng, 10, { animate: false })
    alignPin()
    syncPin()
    map.on('move zoom moveend zoomend resize', syncPin)
    window.addEventListener('resize', alignPin)
    return () => {
      map.off('move zoom moveend zoomend resize', syncPin)
      window.removeEventListener('resize', alignPin)
    }
  }, [mapPoint, mapReady])

  const isSelf = Boolean(data?.query && (data.query === selfIps.v4 || data.query === selfIps.v6))
  const footerLabel = entry?.dbUpdatedAt ? `IP 库最后更新：${formatDbDate(entry.dbUpdatedAt)}` : ''

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cnip-db-updated', { detail: footerLabel }))
  }, [footerLabel])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cnip-query-cards-visible', { detail: Boolean(data) }))
    return () => {
      window.dispatchEvent(new CustomEvent('cnip-query-cards-visible', { detail: false }))
    }
  }, [data])

  const switchSelfIp = (version: 'v4' | 'v6') => {
    const ip = selfIps[version]
    if (!ip) return
    setSelfIps((prev) => ({ ...prev, active: version }))
    setSelectedQuery(ip)
  }

  const focusResult = (ip: string, scroll = true) => {
    setFocusedIp(ip)
    setFocusedFlashIp('')
    window.requestAnimationFrame(() => setFocusedFlashIp(ip))
    window.setTimeout(() => setFocusedFlashIp((current) => current === ip ? '' : current), 1800)
    const element = document.getElementById(cardId(ip))
    if (scroll) {
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <section className="cnp-map-window" id="map-window">
        {lookupQuery.isPending && (showRingLoading ? <RingLoadingSpinner /> : <GridLoadingSpinner />)}
      </section>
      {pinPoint && (
        <span
          aria-hidden="true"
          className="cnp-map-pin cnp-map-pin-overlay"
          style={{ left: `${pinPoint.x}px`, top: `${pinPoint.y}px` }}
        />
      )}
      {lookupQuery.error && (
        <section className="cnp-status-card cnp-error-card"><p>{lookupQuery.error.message}</p></section>
      )}
      {data && (
        <section id="results" className="cnp-results-section">
          {data.resolvedIps && data.resolvedIps.length > 0 && data.queryType === 'domain' && (
            <div className="cnp-resolved-box">
              <div className="cnp-resolved-head">
                <div>
                  <strong>域名解析 · {data.resolvedIps.length} 条记录</strong>
                  <span className="cnp-dns-source">解析源：{dnsResolverLabel(data.resolver || dnsResolver)}{data.resolverIp ? ` · ${data.resolverIp}` : ''}</span>
                </div>
                <a className="cnp-powered-link" href={`https://dns.nf/lookup/${data.query}?type=ALL`} target="_blank" rel="noreferrer">Powered by <span className="cnp-dns-brand">dns.nf</span></a>
              </div>
              <div className="cnp-dns-resolver-tabs" aria-label="DNS 解析源">
                {DNS_RESOLVERS.map((resolver) => (
                  <button
                    className={`cnp-dns-resolver-tab${dnsResolver === resolver.id ? ' active' : ''}`}
                    type="button"
                    key={resolver.id}
                    onClick={() => selectDNSResolver(resolver.id)}
                    title={resolver.detail}
                  >
                    <span className="cnp-dns-resolver-icon" data-resolver={resolver.id}>
                      <DNSResolverIcon id={resolver.id} />
                    </span>
                    <span className="cnp-dns-resolver-copy">
                      <span>{resolver.label}</span>
                      <small>{resolver.detail}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="cnp-resolved-table">
                <div className="cnp-resolved-row cnp-resolved-row-head"><span>#</span><span>IP 地址</span><span>类型</span></div>
                {data.resolvedIps.map((ip, index) => (
                  <button className={`cnp-resolved-row cnp-resolved-row-clickable ${primary?.ip === ip ? 'cnp-resolved-row-active' : ''}`} key={ip} type="button" onClick={() => focusResult(ip)}>
                    <span className="cnp-resolved-idx">{index + 1}</span><code>{ip}</code>
                    <span className={`cnp-family-badge ${isIPv6(ip) ? 'cnp-badge-v6' : 'cnp-badge-v4'}`}>{isIPv6(ip) ? 'IPv6' : 'IPv4'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="cnp-result-list">
            {data.results.map((item) => (
              <article id={cardId(item.ip)} className={`cnp-result-card ${primary?.ip === item.ip ? 'cnp-result-card-active' : ''} ${focusedFlashIp === item.ip ? 'cnp-result-card-focus' : ''}`} key={item.ip} onClick={() => focusResult(item.ip, false)}>
                <div className="cnp-result-title-row">
                  <div className="cnp-result-title-left">
                    {isSelf && <span className="cnp-self-tag">My IP</span>}
                    {isSelf && selfIps.v4 && selfIps.v6 && (
                      <div className="cnp-ip-toggle">
                        <button type="button" className={`cnp-ip-toggle-btn ${selfIps.active === 'v4' ? 'active' : ''}`} onClick={() => switchSelfIp('v4')}>v4</button>
                        <button type="button" className={`cnp-ip-toggle-btn ${selfIps.active === 'v6' ? 'active' : ''}`} onClick={() => switchSelfIp('v6')}>v6</button>
                      </div>
                    )}
                  </div>
                  <h3>{item.ip}</h3>
                  <span className={`cnp-family-badge ${item.family === 'ipv6' ? 'cnp-badge-v6' : 'cnp-badge-v4'}`}>{item.family === 'ipv6' ? 'IPv6' : 'IPv4'}</span>
                </div>
                <div className="cnp-result-table">
                  {visibleFields(item).map((field) => {
                    const flag = field.key === 'country' ? flagUrl(regionCode(item)) : ''
                    const tip = field.key === 'timeZone' ? (formatTimezoneLocal(item.timeZone) || field.desc) : field.desc
                    return (
                      <div className="cnp-result-row cnp-result-row-icon" key={field.key}>
                        <div className="cnp-result-meta">
                          <span className="cnp-result-icon">
                            {flag ? <img src={flag} alt="" className="cnp-icon-flag" /> : <img src={iconUrl(field.icon)} alt="" className="cnp-icon-svg" />}
                          </span>
                          <span className="cnp-result-label">{field.label}<span className="cnp-result-label-en">{field.en}</span></span>
                        </div>
                        <span className="cnp-result-value">{valueOf(item, field.key)}</span>
                        <span className="cnp-result-info" data-tip={tip}>?</span>
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
