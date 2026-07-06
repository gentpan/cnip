import { createFileRoute } from '@tanstack/react-router'
import { LookupView } from '@/components/LookupView'
import { canonicalLink, jsonLdScript, seoMeta, softwareApplicationJsonLd } from '@/lib/seo'

export const Route = createFileRoute('/ip/$target')({
  head: ({ params }) => ({
    meta: seoMeta({
      title: `${decodeTarget(params.target)} IP 归属地查询`,
      description: `查询 ${decodeTarget(params.target)} 的 IP 归属地、ASN、运营商、经纬度、时区和地图位置，支持 IPv4 与 IPv6。`,
      keywords: ['IP归属地查询', 'IPv4查询', 'IPv6查询', decodeTarget(params.target)],
    }) as never,
    links: [canonicalLink(`/ip/${encodeURIComponent(decodeTarget(params.target))}`)],
    scripts: [jsonLdScript(softwareApplicationJsonLd(`/ip/${encodeURIComponent(decodeTarget(params.target))}`))],
  }),
  component: IPLookup,
})

function decodeTarget(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function IPLookup() {
  const { target } = Route.useParams()
  return <LookupView search={{ q: decodeTarget(target) }} />
}
