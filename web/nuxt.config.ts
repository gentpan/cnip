const siteKey = process.env.NUXT_PUBLIC_SITE_KEY === 'cnip' ? 'cnip' : 'ip2region'

export default defineNuxtConfig({
  compatibilityDate: '2026-03-29',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: siteKey === 'cnip' ? 'cnip.io 中文 IP 查询' : 'ip2region.io / cnip.io',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content: siteKey === 'cnip'
            ? 'cnip.io 是一个面向中文用户的 IP 归属地查询站点，支持 IPv4、IPv6、域名解析与本地 ip2region 数据查询。'
            : 'ip2region.io 与 cnip.io 使用的本地 ip2region IP 查询站点，支持 IPv4、IPv6 和域名。'
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '',
      siteKey: process.env.NUXT_PUBLIC_SITE_KEY || ''
    }
  },
  routeRules: {
    '/': { prerender: true }
  }
})
