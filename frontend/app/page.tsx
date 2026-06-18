"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-screen">
      <div className="gradient-hero border-b border-border/50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mb-10 text-center slide-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full glass border-border px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              <span className="text-xs font-medium text-content-secondary">
                OpenBron Premium — Alpha
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-content-primary sm:text-5xl lg:text-6xl">
              Doorzoek
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                {" "}Nederlandse{" "}
              </span>
              Overheidsdocumenten
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-content-secondary">
              Vind Woo-verzoeken, raadsagenda&apos;s, raadsnotulen en meer — met
              krachtige hybride zoekopdrachten en AI-gestuurde antwoorden.
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
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="mt-12 text-center slide-up">
            <div className="glass-card mx-auto max-w-sm rounded-2xl p-8">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-sm text-content-secondary">Documenten doorzoeken...</p>
            </div>
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
    </div>
  );
}
