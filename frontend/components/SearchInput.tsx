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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl fade-in">
      <div className="glass-input relative rounded-2xl">
        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Dutch government documents..."
          className="w-full bg-transparent px-5 py-4 pl-14 text-lg text-content-primary placeholder-content-tertiary outline-none"
        />
      </div>
    </form>
  );
}
