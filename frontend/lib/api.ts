interface SearchParams {
  q: string;
  page?: number;
  pageSize?: number;
  source?: string;
  organization?: string;
  dateFrom?: string;
  dateTo?: string;
  minRedaction?: number;
  maxRedaction?: number;
  entity?: string;
  entityType?: string;
}

interface DocumentResult {
  document_id: number;
  title: string;
  source: string;
  source_url: string | null;
  pdf_url: string | null;
  publication_date: string | null;
  organization: string | null;
  redaction_ratio: number | null;
  metadata: Record<string, unknown> | null;
  chunk_id: number;
  chunk_index: number;
  page_number: number;
  content: string;
  vector_distance: number;
  bm25_score: number;
  combined_score: number;
}

interface SearchResponse {
  results: DocumentResult[];
  total: number;
  page: number;
  pageSize: number;
}

interface ChatResponse {
  answer: string;
  citations: {
    document_id: number;
    title: string;
    page_number: number;
    quote: string;
    pdf_url: string | null;
    chunk_index: number;
    source: string;
  }[];
}

export async function searchDocuments(params: SearchParams): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("q", params.q);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));
  if (params.source) queryParams.set("source", params.source);
  if (params.organization) queryParams.set("organization", params.organization);
  if (params.dateFrom) queryParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) queryParams.set("dateTo", params.dateTo);
  if (params.minRedaction !== undefined) queryParams.set("minRedaction", String(params.minRedaction));
  if (params.maxRedaction !== undefined) queryParams.set("maxRedaction", String(params.maxRedaction));
  if (params.entity) queryParams.set("entity", params.entity);
  if (params.entityType) queryParams.set("entityType", params.entityType);

  const res = await fetch(`/api/search?${queryParams.toString()}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.statusText}`);
  }

  return res.json();
}

export async function chatQuery(message: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`Chat failed: ${res.statusText}`);
  }

  return res.json();
}

export interface NetworkNode {
  id: string;
  name: string;
  group: "PER" | "ORG" | "GPE";
  docCount: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  weight: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export async function fetchNetworkData(): Promise<NetworkData> {
  const res = await fetch("/api/analytics/network", {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Network data fetch failed: ${res.statusText}`);
  }

  return res.json();
}
