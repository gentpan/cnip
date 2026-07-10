import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { fetchRequestStats, type RequestStats, type RequestStatsWindow } from '@/lib/api'
import { canonicalLink, seoMeta } from '@/lib/seo'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: seoMeta({
      title: '关于 cnip.io - IP 查询、域名解析与地图定位工具',
      description: '了解 cnip.io 的用途、数据来源、更新方式、公开 API 能力和 IP 归属地查询边界。适合开发调试、网络排障和轻量集成。',
      path: '/about',
      keywords: ['关于cnip', 'IP查询工具', 'IP归属地数据', 'ip2region', '网络排障工具'],
    }) as never,
    links: [canonicalLink('/about')],
  }),
  component: About,
})

function About() {
  const cards = [
    {
      title: '定位与用途',
      body: 'cnip.io 是一个轻量的 IP 与域名查询工具，面向日常排障、开发调试、线路观察和接口集成。',
      items: ['IPv4 / IPv6 双栈查询', '域名多解析结果展示', '地图定位与坐标联动', '适合快速判断访问来源'],
      className: 'cnp-about-icon-data',
    },
    {
      title: '数据与更新',
      body: '服务使用离线 IP 数据库并定期同步，查询结果会随 IP 分配、运营商调整和数据库更新而变化。',
      items: ['国家 / 省份 / 城市', 'ISP / ASN', '经纬度 / 时区', '数据库更新时间在页脚显示'],
      className: 'cnp-about-icon-update',
    },
    {
      title: '接口与访问',
      body: '公开 API 默认免注册、免密钥，适合脚本、监控和低成本集成。生产系统请做好缓存和降级。',
      items: ['JSON / JSONP 返回', '当前公网 IP 获取', '指定 IP 归属地查询', '域名解析后批量返回结果'],
      className: 'cnp-about-icon-enhance',
    },
    {
      title: '边界说明',
      body: 'IP 归属地不是精确地址，也不应作为身份识别或风控判断的唯一依据。',
      items: ['移动网络和代理可能偏移', 'CDN / Anycast 可能显示节点位置', '坐标为城市或网络归属近似值', '异常结果欢迎反馈修正'],
      className: 'cnp-about-icon-privacy',
    },
  ]

  return (
    <section className="cnp-view-page">
      <div className="cnp-view-card cnp-about">
        <div className="cnp-about-hero">
          <h2>关于 cnip.io</h2>
          <p className="cnp-about-tagline">IP 查询 · 域名解析 · 地图定位 · 开放 API</p>
          <p className="cnp-about-intro">cnip.io 帮你快速查看公网 IP、域名解析结果和网络归属信息。页面优先服务中文使用场景，同时保留简洁的 API，方便在脚本、监控和业务系统中调用。</p>
        </div>
        <div className="cnp-about-grid">
          {cards.map((card) => (
            <div className="cnp-about-card" key={card.title}>
              <div className={`cnp-about-card-icon ${card.className}`}>
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <ul>{card.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
        <RequestStatsChart />
        <div className="cnp-about-contact">
          <p>建议、合作或数据反馈</p>
          <a href="mailto:info@cnip.io" className="cnp-about-email" title="点击发送邮件">info#cnip.io</a>
        </div>
      </div>
    </section>
  )
}

const statsWindows: Array<{ id: RequestStatsWindow, label: string, totalKey: keyof Pick<RequestStats, 'last_24h' | 'last_7d' | 'last_30d' | 'all'> }> = [
  { id: 'last_24h', label: '24 小时', totalKey: 'last_24h' },
  { id: 'last_7d', label: '7 天', totalKey: 'last_7d' },
  { id: 'last_30d', label: '30 天', totalKey: 'last_30d' },
  { id: 'all', label: '全部', totalKey: 'all' },
]

function RequestStatsChart() {
  const [activeWindow, setActiveWindow] = useState<RequestStatsWindow>('last_24h')
  const [stats, setStats] = useState<RequestStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetchRequestStats(controller.signal)
      .then((data) => {
        setStats(data)
        setError('')
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return
        setError(err.message || '统计加载失败')
      })
    return () => controller.abort()
  }, [])

  const active = statsWindows.find((item) => item.id === activeWindow) || statsWindows[0]
  const buckets = stats?.series?.[activeWindow] || []
  const max = useMemo(() => Math.max(1, ...buckets.map((bucket) => bucket.count)), [buckets])
  const total = stats ? stats[active.totalKey] : 0

  return (
    <div className="cnp-about-stats">
      <div className="cnp-about-stats-head">
        <div>
          <h3>请求统计</h3>
          <strong>{formatStatsNumber(total)}</strong>
        </div>
        <div className="cnp-about-stats-tabs" role="tablist" aria-label="请求统计时间范围">
          {statsWindows.map((item) => (
            <button
              className={`cnp-about-stats-tab${activeWindow === item.id ? ' active' : ''}`}
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeWindow === item.id}
              onClick={() => setActiveWindow(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cnp-about-chart" aria-label={`${active.label}请求柱形图`}>
        {buckets.length > 0 ? buckets.map((bucket, index) => (
          <div className="cnp-about-chart-bar-wrap" key={`${bucket.start}-${index}`}>
            <span
              className="cnp-about-chart-bar"
              style={{ height: `${Math.max(6, Math.round((bucket.count / max) * 100))}%` }}
              title={`${bucket.label}: ${formatStatsNumber(bucket.count)}`}
            />
            <small>{pickBarLabel(bucket.label, index, buckets.length)}</small>
          </div>
        )) : (
          <div className="cnp-about-chart-empty">{error || '暂无统计数据'}</div>
        )}
      </div>
    </div>
  )
}

function formatStatsNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value || 0)
}

function pickBarLabel(label: string, index: number, total: number) {
  if (label === '更早') return label
  if (total <= 12) return label
  if (index === 0 || index === total - 1 || index % Math.ceil(total / 6) === 0) return label
  return ''
}
