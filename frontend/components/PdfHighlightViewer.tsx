"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface Highlight {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  label?: string;
}

interface PdfHighlightViewerProps {
  pdfUrl: string;
  pageNumber: number;
  highlights?: Highlight[];
}

type PdfDocument = Awaited<ReturnType<typeof loadPdf>>;

async function loadPdf(url: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const loadingTask = pdfjs.getDocument(url);
  return await loadingTask.promise;
}

const LEGEND_ITEMS = [
  { color: "rgba(59, 130, 246, 0.25)", label: "Zoekterm" },
  { color: "rgba(239, 68, 68, 0.35)", label: "Gelakt (redactie)" },
];

export default function PdfHighlightViewer({
  pdfUrl,
  pageNumber: initialPage,
  highlights = [],
}: PdfHighlightViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [pageNum, setPageNum] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [renderedSize, setRenderedSize] = useState({ w: 0, h: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredHighlight, setHoveredHighlight] = useState<number | null>(null);

  useEffect(() => {
    setPageNum(initialPage);
  }, [initialPage]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadPdf(pdfUrl)
      .then((doc) => {
        if (!cancelled) {
          setPdf(doc);
          setTotalPages(doc.numPages);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setRenderedSize({ w: viewport.width, h: viewport.height });

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum, scale]);

  const goToPage = useCallback(
    (delta: number) => {
      setPageNum((prev) => {
        const next = prev + delta;
        if (next < 1 || next > totalPages) return prev;
        return next;
      });
    },
    [totalPages],
  );

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 4)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), []);

  const getHighlightStyle = (h: Highlight, index: number) => {
    const isSearch = !h.color || h.color === "blue";
    const bgColor = h.color ?? (isSearch ? "rgba(59, 130, 246, 0.25)" : "rgba(239, 68, 68, 0.35)");
    const borderColor = isSearch ? "rgba(59, 130, 246, 0.6)" : "rgba(239, 68, 68, 0.7)";

    return {
      left: `${h.x * 100}%`,
      top: `${h.y * 100}%`,
      width: `${h.w * 100}%`,
      height: `${h.h * 100}%`,
      background: bgColor,
      border: `1.5px solid ${borderColor}`,
      ...(isSearch
        ? {}
        : {
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239,68,68,0.15) 4px, rgba(239,68,68,0.15) 8px)",
          }),
      transform: hoveredHighlight === index ? "scale(1.02)" : "scale(1)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      boxShadow:
        hoveredHighlight === index
          ? "0 0 12px rgba(59,130,246,0.3)"
          : "0 0 4px rgba(0,0,0,0.06)",
    };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(-1)}
            disabled={pageNum <= 1}
            className="flex items-center gap-1.5 rounded-xl bg-surface-tertiary/50 px-3 py-1.5 text-xs font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Vorige
          </button>
          <span className="text-xs font-medium text-content-secondary">
            Pagina {pageNum} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(1)}
            disabled={pageNum >= totalPages}
            className="flex items-center gap-1.5 rounded-xl bg-surface-tertiary/50 px-3 py-1.5 text-xs font-medium text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            Volgende
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="rounded-xl bg-surface-tertiary/50 p-1.5 text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary disabled:opacity-30"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium text-content-secondary w-10 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 4}
            className="rounded-xl bg-surface-tertiary/50 p-1.5 text-content-secondary transition-all duration-200 hover:bg-surface-tertiary hover:text-content-primary disabled:opacity-30"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl glass-card"
        style={{ minHeight: 400 }}
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-primary/50">
            <div className="glass-card rounded-2xl p-6 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-xs text-content-secondary">PDF laden...</p>
            </div>
          </div>
        )}

        <div className="relative" style={{ width: renderedSize.w, height: renderedSize.h }}>
          <canvas ref={canvasRef} className="block" />

          {highlights.map((h, i) => (
            <div
              key={i}
              className="absolute pointer-events-auto cursor-pointer rounded-sm"
              style={getHighlightStyle(h, i)}
              onMouseEnter={() => setHoveredHighlight(i)}
              onMouseLeave={() => setHoveredHighlight(null)}
              title={h.label ?? undefined}
            >
              {hoveredHighlight === i && h.label && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-primary px-2.5 py-1 text-xs font-medium text-content-primary shadow-lg border border-border">
                  {h.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl glass px-4 py-2.5">
          <span className="text-xs font-semibold text-content-secondary">
            Legenda
          </span>
          {LEGEND_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block h-3.5 w-3.5 rounded-sm border"
                style={{
                  background: item.color,
                  borderColor: item.color.replace("0.25", "0.6").replace("0.35", "0.7"),
                }}
              />
              <span className="text-xs text-content-secondary">{item.label}</span>
            </div>
          ))}
          <span className="text-[10px] text-content-tertiary ml-auto">
            {highlights.length} markering{highlights.length !== 1 ? "en" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
