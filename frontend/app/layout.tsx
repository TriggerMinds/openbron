import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Search, MessageSquare, BarChart3, Bell } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpenBron - Government Document Search & RAG",
  description:
    "Self-hosted search engine for Dutch government documents. Search Woo requests, municipal agendas, and council minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${inter.className} antialiased`}>
        <nav className="sticky top-0 z-50 border-b border-border/50 glass">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <a href="/" className="flex items-center gap-3 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold transition-transform duration-200 group-hover:scale-105">
                  OB
                </div>
                <span className="text-lg font-bold text-content-primary">
                  OpenBron
                </span>
                <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[10px] font-medium text-brand-600">
                  Premium
                </span>
              </a>
              <div className="flex items-center gap-1">
                <a
                  href="/"
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary/50 hover:text-content-primary"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </a>
                <a
                  href="/chat"
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary/50 hover:text-content-primary"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </a>
                <a
                  href="/analytics"
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary/50 hover:text-content-primary"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </a>
                <a
                  href="/settings/alerts"
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary/50 hover:text-content-primary"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Alerts</span>
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
