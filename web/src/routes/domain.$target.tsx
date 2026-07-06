import { createFileRoute } from '@tanstack/react-router'
import { LookupView } from '@/components/LookupView'
import { canonicalLink, jsonLdScript, seoMeta, softwareApplicationJsonLd } from '@/lib/seo'

export const Route = createFileRoute('/domain/$target')({
  head: ({ params }) => ({
    meta: seoMeta({
      title: `${decodeTarget(params.target)} 域名解析与 IP 归属地查询`,
      description: `查询 ${decodeTarget(params.target)} 的 DNS 解析结果、IP 归属地、ASN、运营商、经纬度、时区和地图位置。`,
      keywords: ['域名解析查询', 'DNS查询', 'IP归属地查询', decodeTarget(params.target)],
    }) as never,
    links: [canonicalLink(`/domain/${encodeURIComponent(decodeTarget(params.target))}`)],
    scripts: [jsonLdScript(softwareApplicationJsonLd(`/domain/${encodeURIComponent(decodeTarget(params.target))}`))],
  }),
  component: DomainLookup,
})

function decodeTarget(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function DomainLookup() {
  const { target } = Route.useParams()
  return <LookupView search={{ q: decodeTarget(target) }} />
}
