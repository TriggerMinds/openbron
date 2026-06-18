"use client";

import { useMemo } from "react";

interface SearchFiltersProps {
  source: string;
  organization: string;
  dateFrom: string;
  dateTo: string;
  minRedaction: number;
  maxRedaction: number;
  onSourceChange: (v: string) => void;
  onOrganizationChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onMinRedactionChange: (v: number) => void;
  onMaxRedactionChange: (v: number) => void;
}

export default function SearchFilters({
  source,
  organization,
  dateFrom,
  dateTo,
  minRedaction,
  maxRedaction,
  onSourceChange,
  onOrganizationChange,
  onDateFromChange,
  onDateToChange,
  onMinRedactionChange,
  onMaxRedactionChange,
}: SearchFiltersProps) {
  const fillLeft = useMemo(() => `${Math.min(minRedaction, maxRedaction)}%`, [minRedaction, maxRedaction]);
  const fillRight = useMemo(() => `${100 - Math.max(minRedaction, maxRedaction)}%`, [minRedaction, maxRedaction]);
  const lowValue = useMemo(() => Math.min(minRedaction, maxRedaction), [minRedaction, maxRedaction]);
  const highValue = useMemo(() => Math.max(minRedaction, maxRedaction), [minRedaction, maxRedaction]);

  return (
    <div className="w-full max-w-3xl slide-up">
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-content-primary">Filters</h3>
          <span className="text-xs text-content-tertiary">Refine your search</span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="block text-xs font-medium text-content-secondary">Source</label>
            <select
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
            >
              <option value="">All Sources</option>
              <option value="openoverheid">Open Overheid</option>
              <option value="notubiz">Notubiz</option>
              <option value="ibabs">iBabs</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary">Organization</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => onOrganizationChange(e.target.value)}
              placeholder="e.g. Gemeente Amsterdam"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
            />
          </div>
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <label className="block text-xs font-medium text-content-secondary">
              Gelakt-Index (Redaction): {lowValue}% – {highValue}%
            </label>
            <div className="relative mt-3 h-6">
              <div className="dual-range-track">
                <div
                  className="dual-range-fill"
                  style={{ left: fillLeft, right: fillRight }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lowValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v <= highValue) {
                    onMinRedactionChange(v);
                  } else {
                    onMinRedactionChange(highValue);
                    onMaxRedactionChange(v);
                  }
                }}
                className="z-10"
                aria-label="Minimum redaction percentage"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={highValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= lowValue) {
                    onMaxRedactionChange(v);
                  } else {
                    onMaxRedactionChange(lowValue);
                    onMinRedactionChange(v);
                  }
                }}
                className="z-20"
                aria-label="Maximum redaction percentage"
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-content-tertiary">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
