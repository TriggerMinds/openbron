import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const nodeSql = `
      SELECT
        (entity->>'name') AS name,
        (entity->>'type') AS type,
        COUNT(DISTINCT d.id) AS doc_count
      FROM documents d,
      jsonb_array_elements(d.metadata->'extracted_entities') AS entity
      WHERE d.metadata IS NOT NULL
        AND d.metadata->'extracted_entities' IS NOT NULL
        AND entity->>'type' IN ('PER', 'ORG', 'GPE')
      GROUP BY entity->>'name', entity->>'type'
      HAVING COUNT(DISTINCT d.id) >= 2
      ORDER BY doc_count DESC
      LIMIT 200
    `;

    const nodeResult = await pool.query(nodeSql);
    const nodeMap = new Map<string, { name: string; type: string; docCount: number }>();

    for (const row of nodeResult.rows) {
      const id = `${row.type}:${row.name}`;
      nodeMap.set(id, { name: row.name, type: row.type, docCount: parseInt(row.doc_count, 10) });
    }

    const nodeIds = [...nodeMap.keys()];
    if (nodeIds.length === 0) {
      await pool.end();
      return NextResponse.json({ nodes: [], links: [] });
    }

    const linkSql = `
      WITH entity_docs AS (
        SELECT
          d.id AS doc_id,
          (entity->>'name') AS name,
          (entity->>'type') AS type
        FROM documents d,
        jsonb_array_elements(d.metadata->'extracted_entities') AS entity
        WHERE d.metadata IS NOT NULL
          AND d.metadata->'extracted_entities' IS NOT NULL
          AND entity->>'type' IN ('PER', 'ORG', 'GPE')
      )
      SELECT
        LEAST(e1.type || ':' || e1.name, e2.type || ':' || e2.name) AS source_id,
        GREATEST(e1.type || ':' || e1.name, e2.type || ':' || e2.name) AS target_id,
        COUNT(DISTINCT e1.doc_id) AS weight
      FROM entity_docs e1
      JOIN entity_docs e2
        ON e1.doc_id = e2.doc_id
        AND (e1.type || ':' || e1.name) < (e2.type || ':' || e2.name)
      WHERE (e1.type || ':' || e1.name) = ANY($1::text[])
        AND (e2.type || ':' || e2.name) = ANY($1::text[])
      GROUP BY source_id, target_id
      HAVING COUNT(DISTINCT e1.doc_id) >= 1
      ORDER BY weight DESC
      LIMIT 1000
    `;

    const linkResult = await pool.query(linkSql, [nodeIds]);

    const nodes = [...nodeMap.entries()].map(([id, n]) => ({
      id,
      name: n.name,
      group: n.type as "PER" | "ORG" | "GPE",
      docCount: n.docCount,
    }));

    const links = linkResult.rows.map((row: Record<string, unknown>) => ({
      source: row.source_id as string,
      target: row.target_id as string,
      weight: parseInt(row.weight as string, 10),
    }));

    await pool.end();

    return NextResponse.json({ nodes, links });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "analytics_network_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
