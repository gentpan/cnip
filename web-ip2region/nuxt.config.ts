export default defineNuxtConfig({
  compatibilityDate: '2026-03-29',
  ssr: false,
  devtools: { enabled: false },
  css: ['mapbox-gl/dist/mapbox-gl.css', '~/assets/css/main.css'],
  app: {
    head: {
      title: 'ip2region.io - IP Geolocation Lookup | IP 归属地查询',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'ip2region.io 提供快速精准的 IP 归属地查询服务，支持 IPv4/IPv6 地址与域名解析，覆盖国家、城市、运营商、ASN、坐标、时区等字段。' },
        { name: 'keywords', content: 'IP查询,IP归属地,IP geolocation,IPv4,IPv6,ASN查询,域名解析,IP定位,ip2region.io,ip2region' },
        { property: 'og:title', content: 'ip2region.io - IP Geolocation Lookup' },
        { property: 'og:description', content: '快速精准的 IP 归属地查询，支持 IPv4/IPv6 与域名解析' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://ip2region.io' },
        { property: 'og:site_name', content: 'ip2region.io' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'ip2region.io - IP Geolocation Lookup' },
        { name: 'twitter:description', content: '快速精准的 IP 归属地查询，支持 IPv4/IPv6 与域名解析' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#000000' }
      ],
      link: [
        { rel: 'canonical', href: 'https://ip2region.io' }
      ],
      script: [
        { defer: true, src: 'https://tongji.giantaccel.com/script.js', 'data-website-id': '1f134deb-e5d2-43aa-ad27-e833becd7661' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.ip2region.io',
      mapBaseUrl: process.env.NUXT_PUBLIC_MAP_BASE_URL || 'https://mapbox.mapcdn.io'
    }
  },
  vite: {
    define: {
      __MAPBOX_TOKEN__: JSON.stringify(process.env.NUXT_PUBLIC_MAPBOX_TOKEN || '')
    }
  },
  routeRules: {
    '/': { prerender: true }
  }
})
