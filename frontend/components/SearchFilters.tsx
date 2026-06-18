"use client";

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
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Filters</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">Source</label>
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option value="">All</option>
            <option value="openoverheid">Open Overheid</option>
            <option value="notubiz">Notubiz</option>
            <option value="ibabs">iBabs</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">Organization</label>
          <input
            type="text"
            value={organization}
            onChange={(e) => onOrganizationChange(e.target.value)}
            placeholder="e.g. Gemeente Amsterdam"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Min Redaction: {minRedaction}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={minRedaction}
            onChange={(e) => onMinRedactionChange(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">
            Max Redaction: {maxRedaction}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={maxRedaction}
            onChange={(e) => onMaxRedactionChange(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>
      </div>
    </div>
  );
}
