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
      <div className="mt-8 text-center text-[var(--text-secondary)]">
        <p className="text-lg">No results found for &quot;{query}&quot;</p>
        <p className="mt-1 text-sm">Try adjusting your search terms or filters.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        {total} result{total !== 1 ? "s" : ""} for &quot;{query}&quot;
      </p>
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
