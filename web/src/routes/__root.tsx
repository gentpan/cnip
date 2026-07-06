import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import '@/styles/main.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#0052D9' },
      { name: 'application-name', content: 'cnip.io' },
      { name: 'apple-mobile-web-app-title', content: 'cnip.io' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    scripts: [
      jsonLdScript(websiteJsonLd),
      jsonLdScript(organizationJsonLd),
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
