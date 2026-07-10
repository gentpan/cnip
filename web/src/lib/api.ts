export const API_BASE = import.meta.env.VITE_API_BASE || '/api'
export const DOCS_BASE = import.meta.env.VITE_DOCS_BASE || 'https://api.cnip.io'
export const DOCS_REQUEST_BASE = import.meta.env.VITE_DOCS_REQUEST_BASE || '/api'

export const DNS_RESOLVERS = [
  { id: 'system', label: '默认', detail: '服务器 DNS' },
  { id: 'google', label: 'Google', detail: '8.8.8.8' },
  { id: 'cloudflare', label: 'Cloudflare', detail: '1.1.1.1' },
  { id: 'aliyun', label: '阿里', detail: '223.5.5.5' },
  { id: 'tencent', label: '腾讯', detail: '119.29.29.29' },
] as const

export type DNSResolverId = typeof DNS_RESOLVERS[number]['id']

export const MAP_STYLES = [
  { id: 'blue', label: 'CNIP 默认', url: '' },
  { id: 'road', label: 'Google 路网', url: import.meta.env.VITE_TILE_ROAD || 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=zh-CN&scale=2' },
  { id: 'satellite', label: 'Google 卫星', url: import.meta.env.VITE_TILE_SATELLITE || 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&scale=2' },
  { id: 'terrain', label: 'Google 地形', url: import.meta.env.VITE_TILE_TERRAIN || 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=zh-CN&scale=2' },
] as const

export type MapStyleId = typeof MAP_STYLES[number]['id']

const BLUE_DEFAULT_MAP_STYLE: MapStyleId = 'blue'
const GOOGLE_MAP_STYLES = new Set<MapStyleId>(['road', 'satellite', 'terrain'])
const BLUE_LIGHT_TILE = import.meta.env.VITE_TILE_BLUE_LIGHT || 'https://map.bluecdn.com/styles/positron/{z}/{x}/{y}@2x.png'
const BLUE_DARK_TILE = import.meta.env.VITE_TILE_BLUE_DARK || 'https://map.bluecdn.com/styles/dark-matter/{z}/{x}/{y}@2x.png'

export function normalizeMapStyle(value?: string | null): MapStyleId {
  return MAP_STYLES.some((style) => style.id === value) ? value as MapStyleId : BLUE_DEFAULT_MAP_STYLE
}

export function isGoogleMapStyle(value: MapStyleId) {
  return GOOGLE_MAP_STYLES.has(value)
}

export function getAllowedMapStyles(visitorIsChina?: boolean | null) {
  if (visitorIsChina !== false) {
    return MAP_STYLES.filter((style) => !isGoogleMapStyle(style.id))
  }
  return MAP_STYLES
}

export function getSavedMapStyle(visitorIsChina?: boolean | null): MapStyleId {
  if (typeof window === 'undefined') return BLUE_DEFAULT_MAP_STYLE
  const saved = normalizeMapStyle(window.localStorage.getItem('cnip-map-style'))
  if (visitorIsChina !== false && isGoogleMapStyle(saved)) return BLUE_DEFAULT_MAP_STYLE
  return saved
}

export function tileUrlForStyle(value: MapStyleId, theme?: 'dark' | 'light') {
  if (value === 'blue') {
    const activeTheme = theme || (typeof document !== 'undefined' && document.getElementById('app')?.className.includes('cnp-theme-light') ? 'light' : 'dark')
    return activeTheme === 'dark' ? BLUE_DARK_TILE : BLUE_LIGHT_TILE
  }
  return MAP_STYLES.find((style) => style.id === value)?.url || MAP_STYLES[0].url
}

export function mapStyleLabel(value: MapStyleId) {
  return MAP_STYLES.find((style) => style.id === value)?.label || MAP_STYLES[0].label
}

export function getActiveMapStyle(): MapStyleId {
  if (typeof document === 'undefined') return getSavedMapStyle()
  const classList = document.getElementById('map-bg')?.classList
  const active = MAP_STYLES.find((style) => classList?.contains(`cnp-map-style-${style.id}`))
  return active?.id || getSavedMapStyle()
}

export function isMapPolicyReady() {
  if (typeof document === 'undefined') return false
  return document.getElementById('app')?.getAttribute('data-map-policy-ready') === 'true'
}

export function isChinaLookupResult(item?: LookupResult) {
  if (!item) return false
  const countryCode = (item.countryChar || item.isoCode || '').toUpperCase()
  const country = (item.country || '').toLowerCase()
  return countryCode === 'CN' || country === '中国' || country === 'china'
}

export type LookupResult = {
  ip: string
  family: string
  continent?: string
  country?: string
  countryCode?: string
  flag?: string
  province?: string
  city?: string
  district?: string
  isp?: string
  longitude?: string
  latitude?: string
  areaCode?: string
  cityCode?: string
  zipCode?: string
  timeZone?: string
  asn?: string
  elevation?: string
  weatherStation?: string
  countryChar?: string
  isoCode?: string
}

export type LookupResponse = {
  query: string
  queryType: string
  resolver?: DNSResolverId | string
  resolverIp?: string
  resolvedIps?: string[]
  results: LookupResult[]
}

export type LookupEntry = {
  response: LookupResponse
  dbUpdatedAt: string
  dbVersion: string
}

export type RequestStatsBucket = {
  start: string
  label: string
  count: number
}

export type RequestStatsWindow = 'last_24h' | 'last_7d' | 'last_30d' | 'all'

export type RequestStats = {
  generated_at: string
  last_24h: number
  last_7d: number
  last_30d: number
  all: number
  series: Record<RequestStatsWindow, RequestStatsBucket[]>
}

export async function fetchCurrentIp() {
  const res = await fetch(`${API_BASE}/`, { cache: 'no-store' })
  const text = (await res.text()).trim()
  try {
    const parsed = JSON.parse(text) as { ip?: string }
    return (parsed.ip || text).trim()
  } catch {
    return text
  }
}

export function normalizeDNSResolver(value?: string | null): DNSResolverId {
  return DNS_RESOLVERS.some((resolver) => resolver.id === value) ? value as DNSResolverId : 'cloudflare'
}

export function dnsResolverLabel(value?: string | null) {
  const normalized = normalizeDNSResolver(value)
  const resolver = DNS_RESOLVERS.find((item) => item.id === normalized)
  return resolver?.label || DNS_RESOLVERS[0].label
}

export async function fetchLookup(query: string, resolver?: DNSResolverId, signal?: AbortSignal): Promise<LookupEntry> {
  const normalized = query.trim()
  const params = new URLSearchParams({ q: normalized })
  if (resolver && resolver !== 'cloudflare') {
    params.set('resolver', resolver)
  }
  const res = await fetch(`${API_BASE}/lookup?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) {
    throw new Error(`查询失败：${res.status}`)
  }
  return {
    response: await res.json() as LookupResponse,
    dbUpdatedAt: res.headers.get('x-db-updated-at') || '',
    dbVersion: res.headers.get('x-db-version') || '',
  }
}

export async function fetchRequestStats(signal?: AbortSignal): Promise<RequestStats> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!res.ok) {
    throw new Error(`统计请求失败：${res.status}`)
  }
  const body = await res.json() as { requests?: RequestStats }
  if (!body.requests) throw new Error('统计数据为空')
  return body.requests
}

export async function fetchText(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`请求失败：${res.status}`)
  return (await res.text()).trim()
}

export function isIPv6(value: string) {
  return value.includes(':')
}

export function iconUrl(name: string) {
  return `/icons/${name}.svg`
}

export function flagUrl(code?: string) {
  const normalized = (code || '').toLowerCase()
  if (!normalized || normalized === '-') return ''
  return `https://flagcdn.io/${normalized}.svg`
}

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatDbDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
