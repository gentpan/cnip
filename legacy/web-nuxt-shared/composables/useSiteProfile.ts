export interface SiteProfile {
  key: 'ip2region' | 'cnip'
  siteName: string
  title: string
  description: string
  heroEyebrow: string
  heroTitle: string
  heroIntro: string
  searchLabel: string
  searchPlaceholder: string
  submitText: string
  examples: string[]
  featureTitle: string
  featureNote: string
  features: Array<{ title: string; body: string }>
  updateRule: string
}

const ip2regionProfile: SiteProfile = {
  key: 'ip2region',
  siteName: 'ip2region.io',
  title: 'ip2region.io / cnip.io',
  description: 'ip2region.io 与 cnip.io 使用的本地 ip2region IP 查询站点，支持 IPv4、IPv6 和域名。',
  heroEyebrow: 'Local xdb / Fast lookup / Mobile first',
  heroTitle: 'ip2region.io / cnip.io IP 查询站点',
  heroIntro: '基于本地 ip2region 数据查询，支持 IPv4、IPv6 和域名查询，面向 ip2region.io 与 cnip.io 部署，页面轻量且移动端优先。',
  searchLabel: '输入 IP 或域名',
  searchPlaceholder: '例如 1.1.1.1 / 2606:4700:4700::1111 / ip2region.io',
  submitText: '开始查询',
  examples: ['8.8.8.8', 'ip2region.io', 'cnip.io'],
  featureTitle: '当前本地数据库版本',
  featureNote: '中国时间每月 1 号，若逢周末顺延到下一个工作日 13:00 自动检查更新。',
  features: [
    { title: '本地查询', body: '后端直接读取本地 xdb 文件，避免远程第三方查询延迟。' },
    { title: '自动更新', body: '支持接入 ip2region.net 的版本信息 API 和下载 API，服务端不做额外限速。' },
    { title: '移动端优先', body: '输入区和结果区都按手机竖屏优先设计，桌面端再增强排版。' }
  ],
  updateRule: '中国时间每月 1 号，若逢周末顺延到下一个工作日 13:00 自动检查更新。'
}

const cnipProfile: SiteProfile = {
  key: 'cnip',
  siteName: 'cnip.io',
  title: 'cnip.io 中文 IP 查询',
  description: 'cnip.io 是一个面向中文用户的 IP 归属地查询站点，支持 IPv4、IPv6、域名解析与本地 ip2region 数据查询。',
  heroEyebrow: '中文优先 / 本地数据库 / 秒级响应',
  heroTitle: 'cnip.io 中文 IP 归属地查询',
  heroIntro: '为中文用户重新设计的独立站点，界面、文案与视觉风格都单独重构。支持 IPv4、IPv6、域名输入，查询结果直接来自本地 ip2region 数据库。',
  searchLabel: '请输入 IP 地址或域名',
  searchPlaceholder: '例如 114.114.114.114 / 2400:3200::1 / cnip.io',
  submitText: '立即查询',
  examples: ['114.114.114.114', '2400:3200::1', 'cnip.io'],
  featureTitle: '数据库版本与更新时间',
  featureNote: '站点使用中国时间调度自动更新，避免页面信息和本地库版本脱节。',
  features: [
    { title: '全中文体验', body: '导航、说明、查询结果和状态提示全部改为中文表述，更适合国内用户直接使用。' },
    { title: '独立视觉重构', body: 'cnip.io 采用单独的配色、排版和信息层级，不再和 ip2region.io 共用同一站点气质。' },
    { title: '本地数据直查', body: 'IPv4 与 IPv6 都通过本地 xdb 库查询，域名会先解析 A/AAAA 记录再返回归属地结果。' }
  ],
  updateRule: '中国时间每月 1 号，如遇周末则顺延到下一个工作日 13:00 自动检查并完成更新。'
}

export const useSiteProfile = () => {
  const config = useRuntimeConfig()
  const initialKey = config.public.siteKey === 'cnip' ? 'cnip' : 'ip2region'
  const siteKey = ref<'ip2region' | 'cnip'>(initialKey)

  const detect = () => {
    if (config.public.siteKey === 'cnip' || config.public.siteKey === 'ip2region') {
      siteKey.value = config.public.siteKey
      return
    }

    if (!import.meta.client) return
    const host = window.location.hostname.toLowerCase()
    siteKey.value = host.includes('cnip.io') ? 'cnip' : 'ip2region'
  }

  const profile = computed(() => (siteKey.value === 'cnip' ? cnipProfile : ip2regionProfile))

  onMounted(detect)

  return {
    siteKey,
    profile
  }
}
