"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { Send, Bot, User, ExternalLink } from "lucide-react";

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

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm OpenBron Chat. Ask me anything about Dutch government documents — Woo requests, council minutes, municipal agendas, and more. I'll answer with precise citations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => (
      <p key={i} className={i > 0 ? "mt-2" : ""}>
        {line}
      </p>
    ));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "user" ? "bg-brand-600 text-white" : "bg-[var(--bg-secondary)]"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-brand-600 text-white"
                  : "border border-[var(--border)] bg-[var(--bg-secondary)]"
              }`}
            >
              <div className="text-sm leading-relaxed">{renderContent(msg.content)}</div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 border-t border-[var(--border)] pt-2">
                  <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">
                    Sources:
                  </p>
                  <div className="space-y-1">
                    {msg.citations.map((cit, ci) => (
                      <div key={ci} className="rounded bg-[var(--bg-primary)] p-2 text-xs">
                        <a
                          href={
                            cit.pdf_url
                              ? `${cit.pdf_url}#page=${cit.page_number}`
                              : "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-medium text-brand-600 hover:underline"
                        >
                          {cit.title} (p. {cit.page_number})
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="mt-0.5 text-[var(--text-secondary)]">&ldquo;{cit.quote}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)]" style={{ animationDelay: "0.1s" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--text-secondary)]" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about government documents..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
