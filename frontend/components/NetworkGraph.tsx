"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";
import { Search, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface NetworkNodeBase {
  id: string;
  name: string;
  group: "PER" | "ORG" | "GPE";
  docCount: number;
}

interface NetworkLinkBase {
  source: string;
  target: string;
  weight: number;
}

interface NetworkGraphProps {
  nodes: NetworkNodeBase[];
  links: NetworkLinkBase[];
  onNodeClick?: (nodeId: string) => void;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  group: "PER" | "ORG" | "GPE";
  docCount: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight: number;
}

const GROUP_COLORS: Record<string, string> = {
  PER: "#6366f1",
  ORG: "#f59e0b",
  GPE: "#10b981",
};

const GROUP_LABELS: Record<string, string> = {
  PER: "Personen",
  ORG: "Organisaties",
  GPE: "Locaties",
};

export default function NetworkGraph({ nodes, links, onNodeClick }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 900, h: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [simData, setSimData] = useState<{
    simNodes: SimNode[];
    simLinks: Array<{ source: SimNode; target: SimNode; weight: number }>;
  } | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDim({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const nodeMap = new Map<string, SimNode>();
    const simNodes: SimNode[] = nodes.map((n, i) => {
      const node: SimNode = {
        id: n.id,
        name: n.name,
        group: n.group,
        docCount: n.docCount,
        index: i,
        x: dim.w / 2 + (Math.random() - 0.5) * 200,
        y: dim.h / 2 + (Math.random() - 0.5) * 200,
      };
      nodeMap.set(n.id, node);
      return node;
    });

    const rawLinks: SimLink[] = [];
    for (const l of links) {
      const sNode = nodeMap.get(l.source);
      const tNode = nodeMap.get(l.target);
      if (sNode && tNode) {
        rawLinks.push({ source: sNode, target: tNode, weight: l.weight });
      }
    }

    const linkForce = forceLink<SimNode, SimLink>(rawLinks)
      .id((d: SimNode) => d.id)
      .distance(100)
      .strength((l: SimLink) => (l.weight || 0) * 0.02);

    const simulation = forceSimulation<SimNode>(simNodes)
      .force("link", linkForce)
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(dim.w / 2, dim.h / 2))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d: SimNode) => Math.sqrt(d.docCount) * 5 + 8),
      )
      .alphaDecay(0.02);

    let frameId: number;
    const tick = () => {
      const currentLinks = linkForce.links() as SimLink[];
      const resolvedLinks = currentLinks
        .map((l) => {
          const src = typeof l.source === "object" ? (l.source as SimNode) : null;
          const tgt = typeof l.target === "object" ? (l.target as SimNode) : null;
          if (!src || !tgt) return null;
          return { source: src, target: tgt, weight: l.weight };
        })
        .filter(Boolean) as Array<{ source: SimNode; target: SimNode; weight: number }>;

      setSimData({ simNodes: [...simulation.nodes()], simLinks: resolvedLinks });
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    setTimeout(() => {
      simulation.alphaTarget(0).alpha(0);
      setTimeout(() => cancelAnimationFrame(frameId), 500);
    }, 3000);

    return () => {
      simulation.stop();
      cancelAnimationFrame(frameId);
    };
  }, [nodes, links, dim.w, dim.h]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => {
      const newK = Math.max(0.2, Math.min(5, prev.k * delta));
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      return {
        k: newK,
        x: mx - (mx - prev.x) * (newK / prev.k),
        y: my - (my - prev.y) * (newK / prev.k),
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).classList.contains("graph-bg")) {
      isPanning.current = true;
      panStart.current = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
      onNodeClick?.(nodeId);
    },
    [onNodeClick],
  );

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 });
    setSelectedNode(null);
  }, []);

  const zoomTo = useCallback((factor: number) => {
    setTransform((prev) => ({ ...prev, k: Math.max(0.2, Math.min(5, prev.k * factor)) }));
  }, []);

  type ResolvedLink = { source: SimNode; target: SimNode; weight: number };

  const visibleNodes = useMemo(() => {
    if (!simData) return { nodes: [] as SimNode[], links: [] as ResolvedLink[] };
    if (!selectedNode) {
      return { nodes: simData.simNodes, links: simData.simLinks };
    }
    const connectedIds = new Set<string>();
    connectedIds.add(selectedNode);
    for (const l of simData.simLinks) {
      const sId = l.source.id as string;
      const tId = l.target.id as string;
      if (sId === selectedNode) connectedIds.add(tId);
      if (tId === selectedNode) connectedIds.add(sId);
    }
    const filteredNodes = simData.simNodes.filter((n) => connectedIds.has(n.id));
    const idSet = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = simData.simLinks.filter((l) => {
      const sId = l.source.id as string;
      const tId = l.target.id as string;
      return idSet.has(sId) && idSet.has(tId);
    });
    return { nodes: filteredNodes, links: filteredLinks };
  }, [simData, selectedNode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(GROUP_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: GROUP_COLORS[key] }}
              />
              <span className="text-xs text-content-secondary">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => zoomTo(1.3)}
            className="rounded-xl bg-surface-tertiary/50 p-1.5 text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => zoomTo(0.77)}
            className="rounded-xl bg-surface-tertiary/50 p-1.5 text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={resetView}
            className="rounded-xl bg-surface-tertiary/50 p-1.5 text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl glass-card"
        style={{ height: dim.h }}
      >
        <svg
          ref={svgRef}
          width={dim.w}
          height={dim.h}
          className="cursor-grab active:cursor-grabbing graph-bg"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            {Object.entries(GROUP_COLORS).map(([key, color]) => (
              <radialGradient key={key} id={`glow-${key}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {visibleNodes.links.map((l: ResolvedLink, i: number) => (
              <line
                key={`link-${i}`}
                x1={l.source.x ?? 0}
                y1={l.source.y ?? 0}
                x2={l.target.x ?? 0}
                y2={l.target.y ?? 0}
                stroke="hsl(var(--border-default))"
                strokeWidth={Math.min(l.weight * 0.5, 4)}
                strokeOpacity={0.5}
                className="transition-opacity duration-200"
              />
            ))}

            {visibleNodes.nodes.map((n) => {
              if (n.x === undefined || n.y === undefined) return null;
              const r = Math.sqrt(n.docCount) * 4 + 4;
              const isHovered = hoveredNode === n.id;
              const isSelected = selectedNode === n.id;
              const color = GROUP_COLORS[n.group] || "#6b7280";

              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  style={{ cursor: "pointer" }}
                  onPointerEnter={() => setHoveredNode(n.id)}
                  onPointerLeave={() => setHoveredNode(null)}
                  onPointerDown={(e) => handleNodePointerDown(e, n.id)}
                >
                  {isHovered && (
                    <circle
                      r={r + 12}
                      fill={`url(#glow-${n.group})`}
                      className="pointer-events-none"
                    />
                  )}

                  <circle
                    r={r}
                    fill={color}
                    fillOpacity={isHovered || isSelected ? 1 : 0.85}
                    stroke={isSelected ? "#fff" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                    className="transition-all duration-200"
                    style={{
                      filter: isHovered || isSelected ? "brightness(1.15)" : undefined,
                    }}
                  />

                  {isHovered && (
                    <circle r={r + 3} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.3}>
                      <animate
                        attributeName="r"
                        from={r + 3}
                        to={r + 10}
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="strokeOpacity"
                        from="0.3"
                        to="0"
                        dur="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  <text
                    dy={r + 14}
                    textAnchor="middle"
                    fill="hsl(var(--content-secondary))"
                    fontSize={Math.max(10, Math.min(13, r * 0.6))}
                    fontFamily="inherit"
                    className="select-none pointer-events-none"
                  >
                    {n.name.length > 18 ? n.name.slice(0, 18) + "…" : n.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {hoveredNode && simData && (
          <div className="absolute bottom-4 left-4 rounded-xl glass border-border px-3 py-2 shadow-lg fade-in pointer-events-none">
            <p className="text-sm font-medium text-content-primary">
              {simData.simNodes.find((n) => n.id === hoveredNode)?.name}
            </p>
            <p className="text-xs text-content-secondary">
              {simData.simNodes.find((n) => n.id === hoveredNode)?.docCount} documenten
              &middot;{" "}
              {GROUP_LABELS[simData.simNodes.find((n) => n.id === hoveredNode)?.group ?? ""] ??
                "Onbekend"}
            </p>
          </div>
        )}

        {selectedNode && (
          <div className="absolute right-4 top-4">
            <button
              onClick={resetView}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-600 transition-all duration-200 hover:bg-brand-500/20"
            >
              <Search className="h-3 w-3" />
              Reset filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
