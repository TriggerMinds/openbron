"use client";

import { useState, useRef, FormEvent, useEffect, useCallback } from "react";
import { Send, Bot, User, ExternalLink, FileText, X } from "lucide-react";

interface Citation {
  document_id: number;
  title: string;
  page_number: number;
  quote: string;
  pdf_url: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface SelectedDocument {
  citation: Citation;
  index: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm OpenBron Chat. Ask me anything about Dutch government documents — Woo requests, council minutes, municipal agendas, and more. I'll answer with precise citations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SelectedDocument | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const docViewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedDoc && docViewerRef.current) {
      docViewerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDoc]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer,
        citations: data.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCitationClick = useCallback((citation: Citation, index: number) => {
    setSelectedDoc({ citation, index });
  }, []);

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => (
      <p key={i} className={i > 0 ? "mt-2" : ""}>
        {line}
      </p>
    ));
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col lg:flex-row lg:gap-4">
      <div className="flex flex-1 flex-col rounded-2xl glass-card overflow-hidden lg:max-w-[55%]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white"
                    : "glass border-border"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-brand-600" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white"
                    : "glass border-border"
                }`}
              >
                <div className="text-sm leading-relaxed">{renderContent(msg.content)}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 border-t border-border/50 pt-2">
                    <p className="mb-2 text-xs font-semibold text-content-secondary">
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((cit, ci) => (
                        <button
                          key={ci}
                          onClick={() => handleCitationClick(cit, ci)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-200 hover-lift ${
                            selectedDoc?.index === ci &&
                            selectedDoc?.citation.document_id === cit.document_id
                              ? "border-brand-500/40 bg-brand-500/10 text-brand-600"
                              : "border-border text-content-secondary hover:border-brand-500/30 hover:text-brand-600"
                          }`}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-medium text-brand-600">
                            {ci + 1}
                          </span>
                          {cit.title.length > 30
                            ? cit.title.slice(0, 30) + "…"
                            : cit.title}{" "}
                          (p. {cit.page_number})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full glass border-border">
                <Bot className="h-4 w-4 text-brand-600" />
              </div>
              <div className="glass rounded-2xl border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500/40" />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-brand-500/40"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-brand-500/40"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border/50 p-4">
          <div className="flex gap-3">
            <div className="glass-input relative flex-1 rounded-2xl">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full bg-transparent px-4 py-3 text-sm text-content-primary placeholder-content-tertiary outline-none"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-brand-600 hover-lift disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      <div
        ref={docViewerRef}
        className="mt-4 flex flex-col rounded-2xl glass-card overflow-hidden lg:mt-0 lg:w-[45%] lg:max-w-[45%]"
      >
        {selectedDoc ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
              <h3 className="text-sm font-semibold text-content-primary">
                Document Viewer
              </h3>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-full p-1 text-content-tertiary transition-colors hover:bg-surface-tertiary/50 hover:text-content-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-thin">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-xs font-medium text-brand-600">
                  {selectedDoc.index + 1}
                </span>
                <h4 className="text-sm font-medium text-content-primary">
                  {selectedDoc.citation.title}
                </h4>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-content-secondary">
                <span className="flex items-center gap-1 rounded-full bg-surface-tertiary/50 px-2.5 py-1">
                  <FileText className="h-3 w-3" />
                  Page {selectedDoc.citation.page_number}
                </span>
              </div>

              <div className="rounded-xl border border-border/50 bg-surface-secondary/50 p-4">
                <p className="text-xs font-medium text-content-secondary">
                  Geciteerde passage
                </p>
                <blockquote className="mt-2 border-l-2 border-brand-400 pl-3 text-sm italic text-content-primary">
                  &ldquo;{selectedDoc.citation.quote}&rdquo;
                </blockquote>
              </div>

              <a
                href={
                  selectedDoc.citation.pdf_url
                    ? `${selectedDoc.citation.pdf_url}#page=${selectedDoc.citation.page_number}`
                    : "#"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-brand-600 hover-lift"
              >
                <ExternalLink className="h-4 w-4" />
                Open PDF op pagina {selectedDoc.citation.page_number}
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass border-border">
                <FileText className="h-7 w-7 text-content-tertiary" />
              </div>
              <p className="text-sm font-medium text-content-primary">Document Viewer</p>
              <p className="mt-1 text-xs text-content-tertiary">
                Klik op een bronbadge om het document hier te bekijken
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
