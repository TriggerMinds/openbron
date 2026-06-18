import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Citation {
  document_id: number;
  title: string;
  page_number: number;
  quote: string;
  pdf_url: string | null;
  chunk_index: number;
  source: string;
}

interface ChunkResult {
  document_id: number;
  title: string;
  source: string;
  pdf_url: string | null;
  page_number: number;
  content: string;
  combined_score: number;
  chunk_index: number;
  extracted_entities: unknown;
}

async function hybridSearch(query: string, limit = 15): Promise<ChunkResult[]> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const sql = `
    SELECT
      dc.document_id,
      d.title,
      d.source,
      d.pdf_url,
      dc.page_number,
      dc.chunk_index,
      dc.content,
      d.metadata->'extracted_entities' AS extracted_entities,
      ts_rank(
        to_tsvector('dutch', dc.content),
        plainto_tsquery('dutch', $1)
      ) AS score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE
      dc.embedding IS NOT NULL
      AND (
        d.title ILIKE '%' || $1 || '%'
        OR dc.content ILIKE '%' || $1 || '%'
      )
    ORDER BY score DESC
    LIMIT $2
  `;

  const result = await pool.query(sql, [query, limit]);
  await pool.end();

  return result.rows.map((row: Record<string, unknown>) => ({
    document_id: row.document_id as number,
    title: row.title as string,
    source: row.source as string,
    pdf_url: row.pdf_url as string | null,
    page_number: row.page_number as number,
    chunk_index: row.chunk_index as number,
    content: row.content as string,
    combined_score: row.score as number,
    extracted_entities: row.extracted_entities,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    logger.info({ message }, "chat_request");

    const chunks = await hybridSearch(message);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant documents in the database to answer your question. Try rephrasing or searching for a different topic.",
        citations: [],
      });
    }

    const contextText = chunks
      .map(
        (c, i) =>
          `[Source ${i + 1}] Document: "${c.title}" (Page ${c.page_number})\nContent: ${c.content}`,
      )
      .join("\n\n");

    const systemPrompt = `You are OpenBron Chat, an AI assistant specialized in Dutch government documents. Answer the user's question based ONLY on the provided context.

For each fact you state, cite the exact source document title and page number using the format:
> **Source**: [Document Title](#page=N) — "Exact quote from the document"

Always include the page number in the link. If the document has a PDF URL, format the link as: [Document Title](PDF_URL#page=N).

Context from documents:
${contextText}

Answer in Dutch unless the user asks in another language. Be concise and precise.`;

    const openai = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_ENDPOINT,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const answer = completion.choices[0]?.message?.content || "";

    const citations: Citation[] = chunks.slice(0, 5).map((c) => ({
      document_id: c.document_id,
      title: c.title,
      page_number: c.page_number,
      quote: c.content.slice(0, 200),
      pdf_url: c.pdf_url,
      chunk_index: c.chunk_index,
      source: c.source,
    }));

    logger.info({ message, answer_length: answer.length, citation_count: citations.length }, "chat_response");

    return NextResponse.json({ answer, citations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "chat_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
