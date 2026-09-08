import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { activeBackend } from "@/lib/store";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Promptbook — AI prompt collection",
  description: "Collect, tag and search the AI prompts that actually work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Promptbook
            </Link>
            <nav className="flex items-center gap-4">
              <span className="hidden text-xs text-muted sm:inline">Local collection</span>
              <Link
                href="/prompts/new"
                className="rounded-xl border border-line px-3 py-1.5 text-sm transition hover:border-neutral-600"
              >
                New prompt
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted">
            {activeBackend() === "supabase" ? (
              <>Prompts are stored in Supabase.</>
            ) : (
              <>
                Prompts are stored in <code className="font-mono">.data/collection.json</code> on
                this machine — set the Supabase keys to share them.
              </>
            )}{" "}
            Image generation is parked until an API key is available.
          </div>
        </footer>
      </body>
    </html>
  );
}
