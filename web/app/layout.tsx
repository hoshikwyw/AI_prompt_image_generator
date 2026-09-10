import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { isAdmin } from "@/lib/admin";
import { activeBackend } from "@/lib/store";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Promptbook — AI prompt collection",
  description: "Collect, tag and search the AI prompts that actually work.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c12",
  // No maximum-scale: pinch-zoom is an accessibility feature, not a bug.
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
              <span
                className="h-6 w-6 rounded-lg bg-linear-to-br from-indigo-400 to-fuchsia-500 shadow-sm transition group-hover:scale-105 sm:h-7 sm:w-7"
                aria-hidden
              />
              Promptbook
            </Link>

            <nav className="flex items-center gap-2">
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
            <p>
              {activeBackend() === "supabase" ? (
                <>Prompts are stored in Supabase.</>
              ) : (
                <>
                  Stored locally in <code className="font-mono">.data/collection.json</code>.
                </>
              )}
            </p>
            <p>Image generation is parked until an API key is available.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
