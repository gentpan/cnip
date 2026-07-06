import { createFileRoute } from '@tanstack/react-router'
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
        <div className="cnp-about-contact">
          <p>建议、合作或数据反馈</p>
          <a href="mailto:info@cnip.io" className="cnp-about-email" title="点击发送邮件">info#cnip.io</a>
        </div>
      </div>
    </section>
  )
}
