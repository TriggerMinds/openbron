"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        let pageNum: number;
        if (totalPages <= 7) {
          pageNum = i + 1;
        } else if (currentPage <= 4) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 3) {
          pageNum = totalPages - 6 + i;
        } else {
          pageNum = currentPage - 3 + i;
        }

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`rounded-md border px-3 py-2 text-sm transition ${
              pageNum === currentPage
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-[var(--border)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm transition hover:bg-[var(--bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
