import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpenBron - Government Document Search & RAG",
  description: "Self-hosted search engine for Dutch government documents. Search Woo requests, municipal agendas, and council minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${inter.className} antialiased`}>
        <nav className="border-b border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-brand-600">OpenBron</span>
                <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  Beta
                </span>
              </a>
              <div className="flex items-center gap-4">
                <a
                  href="/"
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Search
                </a>
                <a
                  href="/chat"
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  OpenBron Chat
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
