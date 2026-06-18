import type { Metadata } from "next";
import ChatInterface from "@/components/ChatInterface";

export const metadata: Metadata = {
  title: "OpenBron Chat - RAG Document Assistant",
  description:
    "Ask questions about Dutch government documents with AI-powered answers and precise source citations.",
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 text-center slide-up">
        <h1 className="text-2xl font-bold text-content-primary">OpenBron Chat</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Stel vragen over overheidsdocumenten. Antwoorden bevatten bronvermeldingen met paginanummers.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
