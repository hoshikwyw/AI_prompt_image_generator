import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Toaster from "@/components/Toaster";
import { isAdmin } from "@/lib/admin";
import { SITE_URL } from "@/lib/site";
import { activeBackend } from "@/lib/store";
import { THEME_COOKIE, readTheme } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description =
  "Ready-to-copy AI image prompts for ChatGPT, Gemini, Midjourney and more — for women, men and couples.";

export const metadata: Metadata = {
  // Link previews need absolute URLs, and a local sample image's URL is a path.
  metadataBase: new URL(SITE_URL),
  // Pages set just their own name; the template adds the site's.
  title: { default: "Promptbook — AI image prompts", template: "%s — Promptbook" },
  description,
  openGraph: { siteName: "Promptbook", type: "website", description },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  // The browser bar follows the system theme. An explicit choice on the site
  // cannot change it after load, which is a cosmetic mismatch at worst.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c12" },
  ],
  // No maximum-scale: pinch-zoom is an accessibility feature, not a bug.
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();
  const theme = readTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Absent for "system", so the CSS falls back to prefers-color-scheme.
      data-theme={theme === "system" ? undefined : theme}
    >
      <body className="flex min-h-full flex-col">
        {/* Sticky so the way back to the library is always one tap away on a
            phone, where the page can be very long. */}
        <header className="sticky top-0 z-50 border-b border-line bg-background/80 backdrop-blur-md">
          <div className="shell flex h-14 items-center justify-between gap-3 sm:h-16">
            <Link
              href="/"
              className="group flex items-center gap-2.5 rounded-lg text-base font-semibold tracking-tight sm:text-lg"
            >
              {/* The favicon file itself, not a copy of it: the design lives in
                  scripts/generate-icons.mjs, so the header can never drift from
                  the browser tab or the app icon. alt="" because the name sits
                  right next to it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 transition group-hover:scale-105 group-hover:-rotate-3 sm:h-8 sm:w-8"
              />
              Promptbook
            </Link>

            <nav className="flex items-center gap-2">
              <ThemeToggle initial={theme} />
              {admin ? (
                <>
                  <Link href="/admin" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                    Admin
                  </Link>
                  <Link href="/prompts/new" className="btn btn-primary btn-sm">
                    <span aria-hidden>+</span>
                    <span className="hidden xs:inline">New prompt</span>
                    <span className="xs:hidden">New</span>
                  </Link>
                </>
              ) : (
                <Link href="/admin" className="btn btn-ghost btn-sm">
                  Admin
                </Link>
              )}
            </nav>
          </div>
        </header>

        <main className="shell w-full flex-1 py-8 sm:py-10 lg:py-12">{children}</main>

        <footer className="mt-8 border-t border-line">
          <div className="shell flex flex-col gap-1.5 py-6 text-xs leading-relaxed text-subtle sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p>Copy a prompt, paste it into your favourite AI.</p>
            {/* Where the data lives matters to whoever maintains it, not to a
                visitor — and a read-only deploy says so here. */}
            {admin && (
              <p>
                {activeBackend() === "supabase" ? (
                  <>Prompts are stored in Supabase.</>
                ) : (
                  <>
                    Stored locally in <code className="font-mono">.data/collection.json</code>.
                  </>
                )}
              </p>
            )}
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
