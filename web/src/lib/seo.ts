const SITE_URL = 'https://cnip.io'
const SITE_NAME = 'cnip.io'
const DEFAULT_IMAGE = `${SITE_URL}/android-chrome-512x512.png`

type SeoOptions = {
  title: string
  description: string
  path?: string
  keywords?: string[]
  type?: 'website' | 'article'
}

export function seoMeta({ title, description, path = '/', keywords = [], type = 'website' }: SeoOptions) {
  const canonical = new URL(path, SITE_URL).toString()
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
  const keywordText = keywords.length > 0 ? keywords.join(', ') : undefined

  return [
    { title: fullTitle },
    { name: 'description', content: description },
    ...(keywordText ? [{ name: 'keywords', content: keywordText }] : []),
    { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
    { name: 'author', content: SITE_NAME },
    { property: 'og:locale', content: 'zh_CN' },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: DEFAULT_IMAGE },
    { property: 'og:image:width', content: '512' },
    { property: 'og:image:height', content: '512' },
    { property: 'og:image:alt', content: `${SITE_NAME} logo` },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: DEFAULT_IMAGE },
  ]
}

export function canonicalLink(path = '/') {
  return { rel: 'canonical', href: new URL(path, SITE_URL).toString() }
}

export function jsonLdScript(data: Record<string, unknown>) {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data),
  }
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'zh-CN',
  description: '免费的 IP、IPv6、域名解析与地图定位查询工具。',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_IMAGE,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@cnip.io',
    contactType: 'customer support',
    availableLanguage: ['zh-CN', 'en'],
  },
}

export function softwareApplicationJsonLd(path = '/') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: new URL(path, SITE_URL).toString(),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'IPv4 geolocation lookup',
      'IPv6 geolocation lookup',
      'Domain DNS resolution lookup',
      'ASN and ISP lookup',
      'Map-based coordinate display',
      'Public JSON API',
    ],
  }
}

export function apiDocsJsonLd(path = '/docs') {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'cnip.io API 文档',
    name: 'cnip.io API 文档',
    url: new URL(path, SITE_URL).toString(),
    inLanguage: 'zh-CN',
    description: 'cnip.io 公开 API 文档，支持当前公网 IP、指定 IP、IPv6、域名解析和 JSONP 查询示例。',
    about: ['IP geolocation API', 'IPv6 lookup API', 'Domain DNS lookup API'],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE,
      },
    },
  }
}
