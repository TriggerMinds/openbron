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
    <div className="mt-8 flex items-center justify-center gap-2 fade-in">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="glass-card flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-content-secondary transition-all duration-200 hover:border-brand-500/20 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
        Vorige
      </button>

      <div className="flex items-center gap-1">
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
              className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                pageNum === currentPage
                  ? "glass-card border-brand-500/30 bg-brand-500/10 text-brand-600"
                  : "glass-card text-content-secondary hover:border-brand-500/20 hover:text-brand-600"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="glass-card flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-content-secondary transition-all duration-200 hover:border-brand-500/20 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Volgende
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
