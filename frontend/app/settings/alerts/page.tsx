"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Play,
  RefreshCw,
  Mail,
  Globe,
  MessageSquare,
  Video,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface Feed {
  id: number;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  notification_type: string;
  notification_target: string;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
}

const NOTIFICATION_TYPES = [
  { value: "email", label: "Email", icon: Mail },
  { value: "slack", label: "Slack", icon: MessageSquare },
  { value: "discord", label: "Discord", icon: Video },
  { value: "webhook", label: "Webhook", icon: Globe },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "openoverheid", label: "Open Overheid" },
  { value: "notubiz", label: "Notubiz" },
  { value: "ibabs", label: "iBabs" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [organization, setOrganization] = useState("");
  const [minRedaction, setMinRedaction] = useState(0);
  const [maxRedaction, setMaxRedaction] = useState(100);
  const [notifType, setNotifType] = useState("email");
  const [notifTarget, setNotifTarget] = useState("");

  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState("");

  const lowValue = useMemo(() => Math.min(minRedaction, maxRedaction), [minRedaction, maxRedaction]);
  const highValue = useMemo(() => Math.max(minRedaction, maxRedaction), [minRedaction, maxRedaction]);
  const fillLeft = useMemo(() => `${lowValue}%`, [lowValue]);
  const fillRight = useMemo(() => `${100 - highValue}%`, [highValue]);

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setFeeds(data.feeds ?? []);
      }
    } catch {
      setError("Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const resetForm = () => {
    setName("");
    setQuery("");
    setSource("");
    setOrganization("");
    setMinRedaction(0);
    setMaxRedaction(100);
    setNotifType("email");
    setNotifTarget("");
    setError("");
    setTestResult(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !query.trim()) {
      setError("Name and query are required");
      return;
    }
    setSaving(true);
    setError("");

    const filters: Record<string, unknown> = {};
    if (source) filters.source = source;
    if (organization) filters.organization = organization;
    if (lowValue > 0) filters.min_redaction = lowValue / 100;
    if (highValue < 100) filters.max_redaction = highValue / 100;

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          query: query.trim(),
          filters,
          notification_type: notifType,
          notification_target: notifTarget.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create feed");
        return;
      }

      resetForm();
      await fetchFeeds();
    } catch {
      setError("Failed to create feed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (feed: Feed) => {
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feed.id, is_active: !feed.is_active }),
      });
      await fetchFeeds();
    } catch {
      setError("Failed to update feed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      await fetchFeeds();
    } catch {
      setError("Failed to delete feed");
    }
  };

  const handleTest = async (feed: Feed) => {
    setTestingId(feed.id);
    setTestResult(null);
    try {
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type: feed.notification_type,
          notification_target: feed.notification_target,
        }),
      });
      const data = await res.json();
      setTestResult({ ok: res.ok, msg: data.message ?? (res.ok ? "Test sent" : "Failed") });
    } catch {
      setTestResult({ ok: false, msg: "Connection failed" });
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10">
            <Bell className="h-5 w-5 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">Alert Feeds</h1>
            <p className="mt-1 text-sm text-content-secondary">
              Monitor government documents and get notified when new matches appear.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 fade-in">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {testResult && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm fade-in ${
            testResult.ok
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              : "border-red-500/20 bg-red-500/10 text-red-600"
          }`}
        >
          {testResult.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
          {testResult.msg}
        </div>
      )}

      <div className="glass-card mb-10 rounded-2xl p-6 fade-in">
        <div className="mb-5 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-500" />
          <h2 className="text-base font-semibold text-content-primary">New Feed</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-content-secondary">Feed Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amsterdam bouwprojecten"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary">Search Query</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. bouwvergunning"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-content-secondary">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary">Organization</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Gemeente Amsterdam"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary">
              Gelakt-Index (Redaction): {lowValue}% – {highValue}%
            </label>
            <div className="relative mt-3 h-6">
              <div className="dual-range-track">
                <div className="dual-range-fill" style={{ left: fillLeft, right: fillRight }} />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={lowValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v <= highValue) setMinRedaction(v);
                  else {
                    setMinRedaction(highValue);
                    setMaxRedaction(v);
                  }
                }}
                aria-label="Minimum redaction percentage"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={highValue}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= lowValue) setMaxRedaction(v);
                  else {
                    setMaxRedaction(lowValue);
                    setMinRedaction(v);
                  }
                }}
                aria-label="Maximum redaction percentage"
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-content-tertiary">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-content-secondary">Notification Type</label>
              <div className="mt-1.5 flex gap-2">
                {NOTIFICATION_TYPES.map((nt) => {
                  const Icon = nt.icon;
                  const selected = notifType === nt.value;
                  return (
                    <button
                      key={nt.value}
                      type="button"
                      onClick={() => setNotifType(nt.value)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        selected
                          ? "bg-brand-500 text-white shadow-sm"
                          : "border border-border bg-surface-primary text-content-secondary hover:bg-surface-tertiary"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {nt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary">
                {notifType === "email" ? "Email Address" : "Webhook URL"}
              </label>
              <input
                type={notifType === "email" ? "email" : "url"}
                value={notifTarget}
                onChange={(e) => setNotifTarget(e.target.value)}
                placeholder={
                  notifType === "email"
                    ? "user@example.com"
                    : "https://hooks.example.com/..."
                }
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-primary px-3 py-2 text-sm text-content-primary placeholder-content-tertiary outline-none transition focus:border-brand-500/50 focus:shadow-[0_0_0_3px_hsl(var(--brand-500)/0.1)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Creating..." : "Create Feed"}
            </button>
            {name && query && notifTarget && (
              <button
                type="button"
                onClick={() => {
                  handleTest({
                    id: 0,
                    name,
                    query,
                    filters: {},
                    notification_type: notifType,
                    notification_target: notifTarget,
                    is_active: true,
                    last_checked_at: null,
                    created_at: "",
                  });
                }}
                disabled={testingId !== null}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-content-secondary transition-all hover:bg-surface-tertiary disabled:opacity-50"
              >
                {testingId !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Test Connection
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {feeds.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center fade-in">
            <Bell className="mx-auto mb-3 h-8 w-8 text-content-tertiary" />
            <p className="text-sm text-content-secondary">No alert feeds configured yet.</p>
            <p className="mt-1 text-xs text-content-tertiary">Create one above to start monitoring.</p>
          </div>
        ) : (
          feeds.map((feed) => {
            const NotifIcon =
              NOTIFICATION_TYPES.find((nt) => nt.value === feed.notification_type)?.icon ?? Globe;
            return (
              <div
                key={feed.id}
                className="glass-card rounded-2xl p-5 fade-in hover-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-content-primary truncate">
                        {feed.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          feed.is_active
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-content-tertiary/10 text-content-tertiary"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            feed.is_active ? "bg-emerald-500" : "bg-content-tertiary"
                          }`}
                        />
                        {feed.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-content-secondary truncate">
                      Query: &ldquo;{feed.query}&rdquo;
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-content-tertiary">
                      <span className="inline-flex items-center gap-1">
                        <NotifIcon className="h-3 w-3" />
                        {feed.notification_type}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Last checked: {formatDate(feed.last_checked_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTest(feed)}
                      disabled={testingId !== null}
                      className="rounded-xl border border-border p-2 text-content-secondary transition-all hover:bg-surface-tertiary hover:text-content-primary disabled:opacity-40"
                      title="Test notification"
                    >
                      {testingId === feed.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(feed)}
                      className={`rounded-xl border p-2 transition-all ${
                        feed.is_active
                          ? "border-border text-content-secondary hover:bg-surface-tertiary hover:text-content-primary"
                          : "border-brand-500/30 text-brand-500 hover:bg-brand-500/10"
                      }`}
                      title={feed.is_active ? "Deactivate" : "Activate"}
                    >
                      {feed.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(feed.id)}
                      className="rounded-xl border border-border p-2 text-content-secondary transition-all hover:bg-red-500/10 hover:text-red-500"
                      title="Delete feed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
