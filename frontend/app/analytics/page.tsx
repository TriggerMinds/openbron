"use client";

import { useEffect, useState } from "react";
import { BarChart3, Network, FileText, Users, Building2, MapPin, Loader2 } from "lucide-react";
import NetworkGraph from "@/components/NetworkGraph";
import { fetchNetworkData, type NetworkData } from "@/lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchNetworkData()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load network data");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const perCount = data?.nodes.filter((n) => n.group === "PER").length ?? 0;
  const orgCount = data?.nodes.filter((n) => n.group === "ORG").length ?? 0;
  const gpeCount = data?.nodes.filter((n) => n.group === "GPE").length ?? 0;
  const totalDocs =
    data?.nodes.reduce((acc, n) => acc + n.docCount, 0) ?? 0;

  const handleNodeClick = (nodeId: string) => {
    const node = data?.nodes.find((n) => n.id === nodeId);
    if (node) {
      window.open(`/?entity=${encodeURIComponent(node.name)}&entityType=${node.group}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="gradient-hero border-b border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 text-center slide-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full glass border-border px-4 py-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-brand-500" />
              <span className="text-xs font-medium text-content-secondary">
                Netwerkanalyse
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-content-primary sm:text-4xl">
              Entiteitennetwerk
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-content-secondary">
              Verken de relaties tussen personen, organisaties en locaties in
              Nederlandse overheidsdocumenten.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Network, label: "Entiteiten", value: data?.nodes.length ?? 0 },
              { icon: Users, label: "Personen", value: perCount, color: "text-indigo-500" },
              { icon: Building2, label: "Organisaties", value: orgCount, color: "text-amber-500" },
              { icon: MapPin, label: "Locaties", value: gpeCount, color: "text-emerald-500" },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl glass p-4 text-center fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <stat.icon className={`mx-auto mb-1.5 h-5 w-5 ${stat.color ?? "text-brand-500"}`} />
                <p className="text-2xl font-bold text-content-primary">{stat.value}</p>
                <p className="text-xs text-content-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="mt-12 text-center">
            <div className="glass-card mx-auto max-w-sm rounded-2xl p-8">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm text-content-secondary">Netwerkdata laden...</p>
            </div>
          </div>
        ) : error ? (
          <div className="mt-12 text-center">
            <div className="glass-card mx-auto max-w-md rounded-2xl p-8">
              <p className="text-sm font-medium text-content-primary">Fout bij laden</p>
              <p className="mt-2 text-xs text-content-secondary">{error}</p>
            </div>
          </div>
        ) : data && data.nodes.length > 0 ? (
          <div className="mt-8">
            <NetworkGraph
              nodes={data.nodes}
              links={data.links}
              onNodeClick={handleNodeClick}
            />
            <div className="mt-4 rounded-xl glass px-5 py-3">
              <p className="text-xs text-content-secondary leading-relaxed">
                <strong className="text-content-primary">Interactie:</strong> Sleep om te
                pannen &middot; Scroll om te zoomen &middot; Hover voor details &middot; Klik op
                een node om te filteren op verbonden entiteiten &middot; Klik nogmaals om te
                resetten. Nodes zijn geschaald op basis van het aantal documenten waarin de
                entiteit voorkomt.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-12 text-center">
            <div className="glass-card mx-auto max-w-md rounded-2xl p-8">
              <FileText className="mx-auto mb-4 h-10 w-10 text-content-tertiary" />
              <p className="text-sm font-medium text-content-primary">
                Geen netwerkdata beschikbaar
              </p>
              <p className="mt-2 text-xs text-content-secondary">
                Er moeten eerst documenten met geëxtraheerde entiteiten worden geïndexeerd.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
