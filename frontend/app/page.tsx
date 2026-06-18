"use client";

import { useState, useCallback } from "react";
import SearchInput from "@/components/SearchInput";
import SearchFilters from "@/components/SearchFilters";
import SearchResults from "@/components/SearchResults";
import Pagination from "@/components/Pagination";
import { searchDocuments } from "@/lib/api";

const PAGE_SIZE = 20;

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

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocumentResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [source, setSource] = useState("");
  const [organization, setOrganization] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minRedaction, setMinRedaction] = useState(0);
  const [maxRedaction, setMaxRedaction] = useState(100);

  const handleSearch = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setQuery(q);
    setPage(p);

    try {
      const data = await searchDocuments({
        q,
        page: p,
        pageSize: PAGE_SIZE,
        source: source || undefined,
        organization: organization || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minRedaction: minRedaction > 0 ? minRedaction / 100 : undefined,
        maxRedaction: maxRedaction < 100 ? maxRedaction / 100 : undefined,
      });
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [source, organization, dateFrom, dateTo, minRedaction, maxRedaction]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Search Dutch Government Documents
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Find Woo requests, municipal agendas, council minutes, and more
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <SearchInput onSearch={handleSearch} />
        <SearchFilters
          source={source}
          organization={organization}
          dateFrom={dateFrom}
          dateTo={dateTo}
          minRedaction={minRedaction}
          maxRedaction={maxRedaction}
          onSourceChange={setSource}
          onOrganizationChange={setOrganization}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onMinRedactionChange={setMinRedaction}
          onMaxRedactionChange={setMaxRedaction}
        />
      </div>

      {isLoading ? (
        <div className="mt-8 text-center text-[var(--text-secondary)]">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-2">Searching documents...</p>
        </div>
      ) : (
        <>
          <SearchResults results={results} total={total} query={query} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => handleSearch(query, p)}
          />
        </>
      )}
    </div>
  );
}
