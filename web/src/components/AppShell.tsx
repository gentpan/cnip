import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Code2, Crosshair, Info, MapPinned, Minus, Moon, Plus, Search, Sun } from 'lucide-react'
import { createContext, type FormEvent, type MouseEvent as ReactMouseEvent, useContext, useEffect, useRef, useState } from 'react'
import {
  fetchCurrentIp,
  fetchLookup,
  formatDbDate,
  getActiveMapStyle,
  getAllowedMapStyles,
  getSavedMapStyle,
  iconUrl,
  isMapPolicyReady,
  isChinaLookupResult,
  mapStyleLabel,
  tileUrlForStyle,
  type MapStyleId,
} from '@/lib/api'
import { queryClient } from '@/lib/query'

const queryCards = [
  { title: 'IP 归属地', text: '定位国家、省份、城市与坐标，适合快速判断访问来源。', icon: 'world-map' },
  { title: '网络画像', text: '展示 ISP、ASN、时区等网络归属信息，便于排查线路。', icon: 'satellite-antenna' },
  { title: '双栈查询', text: '支持 IPv4、IPv6 与域名解析，一次查看多条解析结果。', icon: 'globe-with-meridians' },
  { title: '开放接口', text: '提供免密 API 与 cURL 示例，可接入脚本和业务系统。', icon: 'ip-stamp' },
] as const

function initialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem('cnip-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const ThemeContext = createContext<{
  theme: 'dark' | 'light'
  toggleTheme: () => void
} | null>(null)

type MapControlAction = 'pan-up' | 'pan-down' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'reset'
type QueryInputType = 'ipv4' | 'ipv6' | 'domain'

function detectQueryInputType(value: string): QueryInputType | null {
  const normalized = value.trim()
  if (!normalized) return null

  const ipv4Parts = normalized.split('.')
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d{1,3}$/.test(part))) {
    return 'ipv4'
  }

  if (/^[0-9a-f:.]+$/i.test(normalized) && normalized.includes(':')) {
    return 'ipv6'
  }

  if (
    normalized.includes('.') &&
    /[a-z]/i.test(normalized) &&
    normalized.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\.?$/i.test(normalized)
  ) {
    return 'domain'
  }

  return null
}

function queryRoute(value: string, type: QueryInputType | null) {
  const normalized = value.trim().replace(/\.$/, '')
  if (!normalized) return '/'
  if (type === 'domain') return `/domain/${encodeURIComponent(normalized.toLowerCase())}`
  return `/ip/${encodeURIComponent(normalized)}`
}

function decodeRouteValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function queryFromPath(pathname: string) {
  const match = pathname.match(/^\/(?:domain|ip)\/(.+)$/)
  return match ? decodeRouteValue(match[1]) : ''
}

const queryInputTypeLabels: Record<QueryInputType, string> = {
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  domain: '域名',
}

function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('Theme context is unavailable')
  return context
}

function sendMapControl(action: MapControlAction) {
  window.dispatchEvent(new CustomEvent<MapControlAction>('cnip-map-control', { detail: action }))
}

export function AppShell() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mapStyle, setMapStyle] = useState<MapStyleId>('blue')
  const [mapMenuOpen, setMapMenuOpen] = useState(false)
  const [visitorIsChina, setVisitorIsChina] = useState<boolean | null>(null)
  const [query, setQuery] = useState('')
  const [cookieAccepted, setCookieAccepted] = useState(true)
  const [dbUpdatedAt, setDbUpdatedAt] = useState('')
  const [showQueryCards, setShowQueryCards] = useState(false)
  const [themeReady, setThemeReady] = useState(false)
  const mapMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isLookupRoute = location.pathname === '/' || location.pathname.startsWith('/domain/') || location.pathname.startsWith('/ip/')
  const allowedMapStyles = getAllowedMapStyles(visitorIsChina)
  const queryInputType = detectQueryInputType(query)

  useEffect(() => {
    setCookieAccepted(Boolean(window.localStorage.getItem('cnip-cookie-ok')))
    setTheme(initialTheme())
    setThemeReady(true)
  }, [])

  useEffect(() => {
    const onDbUpdated = (event: Event) => {
      setDbUpdatedAt((event as CustomEvent<string>).detail || '')
    }
    window.addEventListener('cnip-db-updated', onDbUpdated)
    return () => window.removeEventListener('cnip-db-updated', onDbUpdated)
  }, [])

  useEffect(() => {
    const onQueryCardsVisible = (event: Event) => {
      setShowQueryCards(Boolean((event as CustomEvent<boolean>).detail))
    }
    window.addEventListener('cnip-query-cards-visible', onQueryCardsVisible)
    return () => window.removeEventListener('cnip-query-cards-visible', onQueryCardsVisible)
  }, [])

  useEffect(() => {
    if (!isLookupRoute) setShowQueryCards(false)
  }, [isLookupRoute])

  useEffect(() => {
    const pathQuery = queryFromPath(location.pathname)
    if (pathQuery) {
      setQuery(pathQuery)
    } else if (location.pathname === '/' && !window.location.search) {
      setQuery('')
    }
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    fetchCurrentIp()
      .then((ip) => fetchLookup(ip))
      .then((entry) => {
        if (cancelled) return
        const isChina = isChinaLookupResult(entry.response.results?.[0])
        setVisitorIsChina(isChina)
      })
      .catch(() => {
        if (!cancelled) setVisitorIsChina(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const next = getSavedMapStyle(visitorIsChina)
    if (next !== mapStyle) {
      window.localStorage.setItem('cnip-map-style', next)
      window.dispatchEvent(new CustomEvent('cnip-map-style-change', { detail: { style: next, theme } }))
      setMapStyle(next)
    } else if (visitorIsChina) {
      window.localStorage.setItem('cnip-map-style', next)
    }
  }, [theme, visitorIsChina])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    navigate({ to: queryRoute(value, detectQueryInputType(value)) })
  }

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem('cnip-theme', next)
      window.dispatchEvent(new CustomEvent('cnip-theme-change', { detail: next }))
      window.dispatchEvent(new CustomEvent('cnip-map-style-change', { detail: { style: mapStyle, theme: next } }))
      return next
    })
  }

  useEffect(() => {
    if (!mapMenuOpen) return
    const closeMenu = (event: globalThis.MouseEvent | TouchEvent) => {
      if (mapMenuRef.current?.contains(event.target as Node)) return
      setMapMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('touchstart', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('touchstart', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [mapMenuOpen])

  const selectMapStyle = (next: MapStyleId) => {
    if (!allowedMapStyles.some((style) => style.id === next)) return
    window.localStorage.setItem('cnip-map-style', next)
    window.dispatchEvent(new CustomEvent('cnip-map-style-change', { detail: { style: next, theme } }))
    setMapStyle(next)
    setMapMenuOpen(false)
  }

  const acceptCookies = () => {
    window.localStorage.setItem('cnip-cookie-ok', '1')
    setCookieAccepted(true)
  }

  const reloadHome = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
      window.location.href = '/'
    } else {
      window.location.reload()
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div
          className={`cnp-app cnp-theme-${theme}`}
          id="app"
          data-map-policy-ready={visitorIsChina !== null ? 'true' : 'false'}
          data-theme-ready={themeReady ? 'true' : 'false'}
        >
          <div className={`cnp-map-bg cnp-map-style-${mapStyle}`} id="map-bg" />
          <MapControls />
          <main className="cnp-page">
            <section className="cnp-nav-wrap">
              <header className="cnp-nav">
                <div className="cnp-nav-bar">
                  <a className="cnp-nav-brand" href="/" aria-label="cnip.io 首页" onClick={reloadHome}>
                    <img className="cnp-nav-logo-image cnp-nav-logo-map" src="/favicon.svg" alt="cnip.io" />
                    <img className="cnp-nav-logo-image cnp-nav-logo-home" src="/logo.svg" alt="" aria-hidden="true" />
                  </a>
                  <form className="cnp-nav-search" onSubmit={submit}>
                    <div className="cnp-nav-search-wrap">
                      <div className="cnp-nav-search-shell">
                        {queryInputType && (
                          <span className={`cnp-nav-query-type cnp-nav-query-type-${queryInputType}`} aria-label={`已识别为${queryInputTypeLabels[queryInputType]}`}>
                            {queryInputTypeLabels[queryInputType]}
                          </span>
                        )}
                        <input
                          className="cnp-nav-query-input"
                          type="text"
                          placeholder="输入 IPv4、IPv6 或域名"
                          autoComplete="off"
                          spellCheck={false}
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </div>
                      <button className="cnp-nav-query-button" type="submit" aria-label="开始查询">
                        <Search aria-hidden="true" />
                      </button>
                      <div className="cnp-nav-map-menu" ref={mapMenuRef}>
                        <button
                          className="cnp-nav-map-button"
                          type="button"
                          aria-label={`选择地图类型，当前为${mapStyleLabel(mapStyle)}`}
                          aria-haspopup="menu"
                          aria-expanded={mapMenuOpen}
                          title={`地图：${mapStyleLabel(mapStyle)}`}
                          onClick={() => setMapMenuOpen((open) => !open)}
                        >
                          <MapPinned aria-hidden="true" />
                        </button>
                        {mapMenuOpen && (
                          <div className="cnp-nav-map-dropdown" role="menu" aria-label="地图类型">
                            {allowedMapStyles.map((style) => (
                              <button
                                className={`cnp-nav-map-option${style.id === mapStyle ? ' active' : ''}`}
                                type="button"
                                role="menuitemradio"
                                aria-checked={style.id === mapStyle}
                                key={style.id}
                                onClick={() => selectMapStyle(style.id)}
                              >
                                <span>{style.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </header>
            </section>
            <Outlet />
            <Footer dbUpdatedAt={dbUpdatedAt} showQueryCards={isLookupRoute && showQueryCards} />
          </main>
          {!isLookupRoute && <StaticMapBootstrap onDbUpdated={setDbUpdatedAt} />}
          {!cookieAccepted && (
            <div className="cnp-cookie" id="cookie">
              <p>本站使用 Cookie 以提供更好的体验。继续使用即表示您同意我们的 Cookie 政策。</p>
              <button type="button" onClick={acceptCookies}>接受</button>
            </div>
          )}
        </div>
      </ThemeContext.Provider>
    </QueryClientProvider>
  )
}

function MapControls() {
  return (
    <div className="cnp-map-controls" aria-label="地图控制">
      <div className="cnp-map-control-group cnp-map-zoom-controls" aria-label="地图缩放">
        <button className="cnp-map-control-btn" type="button" aria-label="放大地图" onClick={() => sendMapControl('zoom-in')}>
          <Plus aria-hidden="true" />
        </button>
        <button className="cnp-map-control-btn cnp-map-reset-btn" type="button" aria-label="地图归位" onClick={() => sendMapControl('reset')}>
          <Crosshair aria-hidden="true" />
        </button>
        <button className="cnp-map-control-btn" type="button" aria-label="缩小地图" onClick={() => sendMapControl('zoom-out')}>
          <Minus aria-hidden="true" />
        </button>
      </div>
      <div className="cnp-map-control-group cnp-map-pan-controls" aria-label="地图移动">
        <span className="cnp-map-control-empty" aria-hidden="true" />
        <button className="cnp-map-control-btn" type="button" aria-label="向上移动地图" onClick={() => sendMapControl('pan-up')}>
          <ChevronUp aria-hidden="true" />
        </button>
        <span className="cnp-map-control-empty" aria-hidden="true" />
        <button className="cnp-map-control-btn" type="button" aria-label="向左移动地图" onClick={() => sendMapControl('pan-left')}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="cnp-map-control-dot" aria-hidden="true" />
        <button className="cnp-map-control-btn" type="button" aria-label="向右移动地图" onClick={() => sendMapControl('pan-right')}>
          <ChevronRight aria-hidden="true" />
        </button>
        <span className="cnp-map-control-empty" aria-hidden="true" />
        <button className="cnp-map-control-btn" type="button" aria-label="向下移动地图" onClick={() => sendMapControl('pan-down')}>
          <ChevronDown aria-hidden="true" />
        </button>
        <span className="cnp-map-control-empty" aria-hidden="true" />
      </div>
    </div>
  )
}

function applyMapControl(map: any, action: MapControlAction, point?: { lat: number, lon: number } | null) {
  const distance = 140
  if (action === 'zoom-in') map.zoomIn(1, { animate: true })
  if (action === 'zoom-out') map.zoomOut(1, { animate: true })
  if (action === 'reset' && point) map.setView([point.lat, point.lon], 10, { animate: true })
  if (action === 'pan-up') map.panBy([0, -distance], { animate: true })
  if (action === 'pan-down') map.panBy([0, distance], { animate: true })
  if (action === 'pan-left') map.panBy([-distance, 0], { animate: true })
  if (action === 'pan-right') map.panBy([distance, 0], { animate: true })
}

function StaticMapBootstrap({ onDbUpdated }: { onDbUpdated: (value: string) => void }) {
  const mapRef = useRef<any>(null)
  const tileRef = useRef<any>(null)
  const [point, setPoint] = useState<{ lat: number, lon: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCurrentIp()
      .then((ip) => fetchLookup(ip))
      .then((entry) => {
        if (cancelled) return
        onDbUpdated(entry.dbUpdatedAt ? `IP 库最后更新：${formatDbDate(entry.dbUpdatedAt)}` : '')
        const item = entry.response.results?.[0]
        const lat = Number(item?.latitude)
        const lon = Number(item?.longitude)
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setPoint({ lat, lon })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [onDbUpdated])

  useEffect(() => {
    if (window.L || document.querySelector('script[data-leaflet]')) return
    const script = document.createElement('script')
    script.src = '/leaflet/leaflet.js'
    script.defer = true
    script.dataset.leaflet = 'true'
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    if (!point) return
    let cancelled = false
    const init = () => {
      const container = document.getElementById('map-bg') as HTMLElement & { _leaflet_id?: number }
      if (cancelled || mapRef.current || !window.L || !container || container._leaflet_id || !isMapPolicyReady()) return
      const L = window.L
      mapRef.current = L.map(container, {
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
      mapRef.current.setView([point.lat, point.lon], 10, { animate: false })
      tileRef.current = L.tileLayer(tileUrlForStyle(getActiveMapStyle()), {
        updateWhenIdle: false,
        keepBuffer: 3,
        maxZoom: 19,
      }).addTo(mapRef.current)
    }
    const timer = window.setInterval(init, 80)
    init()
    return () => {
      cancelled = true
      window.clearInterval(timer)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileRef.current = null
      }
    }
  }, [point])

  useEffect(() => {
    const onMapStyle = (event: Event) => {
      const detail = (event as CustomEvent<MapStyleId | { style: MapStyleId, theme?: 'dark' | 'light' }>).detail
      const style = typeof detail === 'string' ? detail : detail.style
      const nextTheme = typeof detail === 'string' ? undefined : detail.theme
      tileRef.current?.setUrl(tileUrlForStyle(style, nextTheme))
    }
    window.addEventListener('cnip-map-style-change', onMapStyle)
    return () => window.removeEventListener('cnip-map-style-change', onMapStyle)
  }, [])

  useEffect(() => {
    const onMapControl = (event: Event) => {
      const map = mapRef.current
      if (!map) return
      applyMapControl(map, (event as CustomEvent<MapControlAction>).detail, point)
    }
    window.addEventListener('cnip-map-control', onMapControl)
    return () => window.removeEventListener('cnip-map-control', onMapControl)
  }, [point])

  return null
}

export function Footer({ dbUpdatedAt, showQueryCards }: { dbUpdatedAt: string, showQueryCards: boolean }) {
  const currentYear = new Date().getFullYear()
  const { theme, toggleTheme } = useTheme()
  return (
    <footer className="cnp-footer">
      <div className="cnp-footer-logo" aria-hidden="true" />
      {showQueryCards && (
        <section className="cnp-query-cards cnp-footer-query-cards" aria-label="查询能力">
          {queryCards.map((card) => (
            <article className="cnp-query-card" key={card.title}>
              <span className="cnp-query-card-icon" aria-hidden="true">
                <img src={iconUrl(card.icon)} alt="" />
              </span>
              <span className="cnp-query-card-copy">
                <h2>{card.title}</h2>
                <p>{card.text}</p>
              </span>
            </article>
          ))}
        </section>
      )}
      <div className="cnp-footer-pill-wrap">
        <div className="cnp-footer-pill">
          <span className="cnp-pill-item">© {currentYear} cnip.io</span>
          <span className="cnp-pill-sep" />
          <Link className="cnp-footer-link" to="/about"><Info aria-hidden="true" />关于</Link>
          <Link className="cnp-footer-link" to="/docs"><Code2 aria-hidden="true" />API</Link>
          <span className="cnp-pill-sep" />
          <span className="cnp-pill-item cnp-pill-db">{dbUpdatedAt || 'IP 库最后更新读取中'}</span>
          <button className="cnp-footer-theme" type="button" aria-label="切换地图主题" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
        </div>
      </div>
    </footer>
  )
}
