import DocumentCard from "./DocumentCard";

interface DocumentResult {
  document_id: number;
  chunk_id: number;
  title: string;
  source: string;
  source_url: string | null;
  pdf_url: string | null;
  publication_date: string | null;
  organization: string | null;
  redaction_ratio: number | null;
  page_number: number;
  content: string;
  combined_score: number;
}

interface SearchResultsProps {
  results: DocumentResult[];
  total: number;
  query: string;
}

export default function SearchResults({ results, total, query }: SearchResultsProps) {
  if (!query) return null;

  if (results.length === 0) {
    return (
      <div className="mt-10 text-center slide-up">
        <div className="glass-card mx-auto max-w-md rounded-2xl p-8">
          <p className="text-lg font-medium text-content-primary">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-2 text-sm text-content-secondary">
            Try adjusting your search terms or filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 slide-up">
      <div className="mb-5 flex items-center gap-2">
        <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600">
          {total} result{total !== 1 ? "en" : ""}
        </span>
        <span className="text-sm text-content-secondary">
          voor &ldquo;{query}&rdquo;
        </span>
      </div>
      <div className="space-y-4">
        {results.map((doc) => (
          <DocumentCard
            key={`${doc.document_id}-${doc.page_number}-${doc.chunk_id}`}
            title={doc.title}
            source={doc.source}
            organization={doc.organization}
            publicationDate={doc.publication_date}
            redactionRatio={doc.redaction_ratio}
            sourceUrl={doc.source_url}
            pdfUrl={doc.pdf_url}
            pageNumber={doc.page_number}
            snippet={doc.content}
          />
        ))}
      </div>
    </div>
  );
}
