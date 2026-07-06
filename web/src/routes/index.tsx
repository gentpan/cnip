import { createFileRoute } from '@tanstack/react-router'
import { LookupView } from '@/components/LookupView'
import { canonicalLink, jsonLdScript, seoMeta, softwareApplicationJsonLd } from '@/lib/seo'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: seoMeta({
      title: 'IP 归属地查询 - IPv4 / IPv6 / 域名解析定位',
      description: '免费在线查询 IP 归属地、IPv6、域名 DNS 解析、ASN、运营商、经纬度、时区和地图位置。适合网络排障、开发调试和访问来源判断。',
      keywords: ['IP归属地查询', 'IP地址查询', 'IPv6查询', '域名解析查询', 'ASN查询', '运营商查询', 'IP定位', 'GeoIP'],
    }) as never,
    links: [canonicalLink('/')],
    scripts: [jsonLdScript(softwareApplicationJsonLd('/'))],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  return <LookupView search={search} />
}
