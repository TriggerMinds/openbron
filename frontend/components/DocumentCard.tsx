"use client";

import { FileText, ExternalLink, Eye } from "lucide-react";

interface DocumentCardProps {
  title: string;
  source: string;
  organization: string | null;
  publicationDate: string | null;
  redactionRatio: number | null;
  sourceUrl: string | null;
  pdfUrl: string | null;
  pageNumber: number;
  snippet: string;
  highlighted?: boolean;
  onSelect?: () => void;
}

export default function DocumentCard({
  title,
  source,
  organization,
  publicationDate,
  redactionRatio,
  sourceUrl,
  pdfUrl,
  pageNumber,
  snippet,
  highlighted = false,
  onSelect,
}: DocumentCardProps) {
  const docUrl = pdfUrl
    ? `${pdfUrl}#page=${pageNumber}`
    : sourceUrl ?? "#";

  return (
    <div
      className={`glass-card group cursor-pointer rounded-2xl p-5 transition-all duration-300 hover-lift ${
        highlighted ? "border-brand-500/40 ring-1 ring-brand-500/20" : ""
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-content-primary transition-colors group-hover:text-brand-600">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-brand-600"
          >
            {title}
            <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
          </a>
        </h3>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-content-secondary">
        <span className="flex items-center gap-1.5 rounded-full bg-surface-tertiary/50 px-2.5 py-1">
          <FileText className="h-3.5 w-3.5" />
          {source}
        </span>
        {organization && (
          <span className="rounded-full bg-surface-tertiary/50 px-2.5 py-1">
            {organization}
          </span>
        )}
        {publicationDate && (
          <span className="rounded-full bg-surface-tertiary/50 px-2.5 py-1">
            {new Date(publicationDate).toLocaleDateString("nl-NL")}
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-surface-tertiary/50 px-2.5 py-1">
          <Eye className="h-3.5 w-3.5" />
          p. {pageNumber}
        </span>
        {redactionRatio !== null && (
          <span
            className={`rounded-full px-2.5 py-1 ${
              redactionRatio > 0.3
                ? "bg-red-500/10 text-red-600"
                : redactionRatio > 0.1
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {Math.round(redactionRatio * 100)}% gelakt
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-content-secondary">
        {snippet.length > 300 ? snippet.slice(0, 300) + "..." : snippet}
      </p>
    </div>
  );
}
