export default defineNuxtConfig({
  compatibilityDate: '2026-03-29',
  ssr: false,
  devtools: { enabled: false },
  css: ['mapbox-gl/dist/mapbox-gl.css', '~/assets/css/main.css'],
  app: {
    head: {
      title: 'IP归属地查询 - 中国IP地址定位查询工具 | cnip.io',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '免费在线IP归属地查询工具，精准定位中国及全球IP地址归属地。支持IPv4/IPv6查询、域名解析，提供省市区县、运营商、ASN、经纬度坐标、时区等详细信息。快速查询您的公网IP地址。' },
        { name: 'keywords', content: 'IP归属地查询,IP地址查询,中国IP查询,IP定位,查IP,我的IP地址,公网IP查询,IPv4查询,IPv6查询,IP geolocation,ASN查询,域名解析,运营商查询,IP所在地,cnip.io' },
        { property: 'og:title', content: 'IP归属地查询 - 中国IP地址定位查询工具 | cnip.io' },
        { property: 'og:description', content: '免费在线IP归属地查询，精准定位中国及全球IP地址。支持IPv4/IPv6、域名解析，提供城市、运营商、ASN、坐标等信息。' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://cnip.io' },
        { property: 'og:site_name', content: 'cnip.io - IP归属地查询' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'IP归属地查询 - 中国IP地址定位工具 | cnip.io' },
        { name: 'twitter:description', content: '免费在线IP归属地查询，精准定位中国及全球IP地址。支持IPv4/IPv6、域名解析。' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#000000' }
      ],
      link: [
        { rel: 'canonical', href: 'https://cnip.io' }
      ],
      script: [
        { defer: true, src: 'https://tongji.giantaccel.com/script.js', 'data-website-id': '1f134deb-e5d2-43aa-ad27-e833becd7661' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.cnip.io',
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
