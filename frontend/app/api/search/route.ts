import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const offset = (page - 1) * pageSize;

  const source = searchParams.get("source") || undefined;
  const organization = searchParams.get("organization") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const minRedaction = searchParams.get("minRedaction")
    ? parseFloat(searchParams.get("minRedaction")!)
    : undefined;
  const maxRedaction = searchParams.get("maxRedaction")
    ? parseFloat(searchParams.get("maxRedaction")!)
    : undefined;

  const rawEntities = searchParams.getAll("entity");
  const entityType = searchParams.get("entityType") || undefined;

  const entityList: string[] = [];
  for (const e of rawEntities) {
    for (const part of e.split(",")) {
      const trimmed = part.trim();
      if (trimmed) entityList.push(trimmed);
    }
  }

  logger.info({ q, page, pageSize, source, organization, minRedaction, maxRedaction, entityList, entityType }, "search_request");

  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const conditions: string[] = ["d.id IS NOT NULL"];
    const params: (string | number)[] = [q, q, pageSize, offset];
    let paramIdx = 4;

    if (source) {
      paramIdx++;
      conditions.push(`d.source = $${paramIdx}`);
      params.push(source);
    }
    if (organization) {
      paramIdx++;
      conditions.push(`d.organization ILIKE $${paramIdx}`);
      params.push(`%${organization}%`);
    }
    if (dateFrom) {
      paramIdx++;
      conditions.push(`d.publication_date >= $${paramIdx}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      paramIdx++;
      conditions.push(`d.publication_date <= $${paramIdx}`);
      params.push(dateTo);
    }
    if (minRedaction !== undefined) {
      paramIdx++;
      conditions.push(`d.redaction_ratio >= $${paramIdx}`);
      params.push(minRedaction);
    }
    if (maxRedaction !== undefined) {
      paramIdx++;
      conditions.push(`d.redaction_ratio <= $${paramIdx}`);
      params.push(maxRedaction);
    }
    if (entityList.length > 0) {
      conditions.push("d.metadata IS NOT NULL");
      for (const name of entityList) {
        paramIdx++;
        conditions.push(`d.metadata->'extracted_entities' @> $${paramIdx}::jsonb`);
        params.push(JSON.stringify([{ name }]));
      }
    }
    if (entityType) {
      paramIdx++;
      conditions.push(`d.metadata->'extracted_entities' @> $${paramIdx}::jsonb`);
      params.push(JSON.stringify([{ type: entityType }]));
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      WITH ranked AS (
        SELECT
          dc.id AS chunk_id,
          dc.document_id,
          dc.chunk_index,
          dc.page_number,
          dc.content,
          d.title,
          d.source,
          d.source_url,
          d.pdf_url,
          d.publication_date,
          d.organization,
          d.redaction_ratio,
          d.metadata,
          d.metadata->'extracted_entities' AS extracted_entities,
          ts_rank(
            to_tsvector('dutch', dc.content),
            plainto_tsquery('dutch', $1)
          ) AS bm25_score
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE
          ${whereClause}
          AND (
            d.title ILIKE '%' || $1 || '%'
            OR dc.content ILIKE '%' || $1 || '%'
          )
        ORDER BY bm25_score DESC
      )
      SELECT *, COUNT(*) OVER() AS full_count
      FROM ranked
      ORDER BY bm25_score DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(sql, params);
    const rows = result.rows;
    const total = rows.length > 0 ? parseInt(rows[0].full_count, 10) : 0;

    const cleanRows = rows.map((row: Record<string, unknown>) => {
      const { full_count, ...rest } = row;
      return rest;
    });

    await pool.end();

    return NextResponse.json({
      results: cleanRows,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message, q }, "search_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
