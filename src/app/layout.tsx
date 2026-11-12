import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import Providers from "@/components/ui/Providers";
import SiteNav from "@/components/ui/SiteNav";
import SiteFooter from "@/components/ui/SiteFooter";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "./globals.css";

const body = Geist({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — scholarships, programs & loans that fit you`, template: `%s · ${SITE_NAME}` },
  description:
    "Find scholarships, university programs and education loans you are actually eligible for — anywhere in the world, in your currency and time zone.",
  openGraph: { siteName: SITE_NAME, type: "website" },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the boot script sets data-theme before React hydrates.
    <html lang="en" className={`${body.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        {/* Runs before hydration so the saved/system theme is applied without a flash. */}
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-solid focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Providers>
          <SiteNav />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
