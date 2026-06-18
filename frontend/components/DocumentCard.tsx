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
}: DocumentCardProps) {
  const docUrl = pdfUrl
    ? `${pdfUrl}#page=${pageNumber}`
    : sourceUrl ?? "#";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-5 transition hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600"
          >
            {title}
            <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
          </a>
        </h3>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {source}
        </span>
        {organization && <span>{organization}</span>}
        {publicationDate && <span>{new Date(publicationDate).toLocaleDateString("nl-NL")}</span>}
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          p. {pageNumber}
        </span>
        {redactionRatio !== null && (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">
            {Math.round(redactionRatio * 100)}% redacted
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {snippet.length > 300 ? snippet.slice(0, 300) + "..." : snippet}
      </p>
    </div>
  );
}
