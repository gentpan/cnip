import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import '@/styles/main.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'IP归属地查询 - 中国IP地址定位查询工具 | cnip.io' },
      { name: 'description', content: '免费在线IP归属地查询工具，精准定位中国及全球IP地址归属地。支持IPv4/IPv6查询、域名解析，提供省市区县、运营商、ASN、经纬度坐标、时区等详细信息。' },
      { name: 'theme-color', content: '#000000' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'stylesheet', href: '/leaflet/leaflet.css' },
      { rel: 'preconnect', href: 'https://mt1.google.com' },
      { rel: 'preconnect', href: 'https://fonts.bluecdn.com' },
    ],
  }),
  component: Root,
})

function Root() {
  return (
    <RootDocument>
      <AppShell />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
        <script defer src="https://analytics.proxypurity.com/script.js" data-website-id="1f134deb-e5d2-43aa-ad27-e833becd7661" />
        <script defer src="https://analytics.proxypurity.com/recorder.js" data-website-id="1f134deb-e5d2-43aa-ad27-e833becd7661" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
