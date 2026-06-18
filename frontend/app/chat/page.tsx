import type { Metadata } from "next";
import ChatInterface from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "OpenBron Chat - RAG Document Assistant",
  description: "Ask questions about Dutch government documents with AI-powered answers and precise source citations.",
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">OpenBron Chat</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Ask questions about government documents. Answers include citations with page numbers.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
