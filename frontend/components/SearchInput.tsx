"use client";

import { useState, FormEvent } from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

export default function SearchInput({ onSearch, initialQuery = "" }: SearchInputProps) {
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Dutch government documents..."
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-5 py-4 pl-14 text-lg shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
        <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[var(--text-secondary)]" />
      </div>
    </form>
  );
}
