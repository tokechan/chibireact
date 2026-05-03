/* eslint-env node */
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  title: {
    template: '%s — chibireact',
  },
  description: 'React を小さく作りながら学ぶ本',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const navbar = <Navbar logo={<b>chibireact</b>} />
  const pageMap = await getPageMap()
  return (
    <html lang="ja" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="✦" />
      <body>
        <Layout
          banner={<Banner storageKey="chibireact-pre">chibireact (PoC)</Banner>}
          navbar={navbar}
          footer={<Footer>MIT {new Date().getFullYear()} © chibireact.</Footer>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
