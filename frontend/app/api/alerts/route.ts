import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface FeedRow {
  id: number;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  notification_type: string;
  notification_target: string;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
}

function getPool() {
  const { Pool } = require("pg") as typeof import("pg");
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function GET() {
  try {
    const pool = getPool();
    const result = await pool.query<FeedRow>(
      `SELECT id, name, query, filters, notification_type, notification_target,
              is_active, last_checked_at, created_at
       FROM feeds
       ORDER BY created_at DESC`
    );
    await pool.end();

    return NextResponse.json({ feeds: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "alerts_list_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, query, filters, notification_type, notification_target } = body;

    if (!name || !query) {
      return NextResponse.json({ error: "Name and query are required" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query<FeedRow>(
      `INSERT INTO feeds (name, query, filters, notification_type, notification_target)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, query, filters, notification_type, notification_target,
                 is_active, last_checked_at, created_at`,
      [
        name,
        query,
        filters ? JSON.stringify(filters) : "{}",
        notification_type || "email",
        notification_target || null,
      ]
    );
    await pool.end();

    logger.info({ feed_id: result.rows[0].id, name }, "alert_feed_created");

    return NextResponse.json({ feed: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "alert_feed_create_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, query, filters, notification_type, notification_target, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    const setClauses: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    let paramIdx = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(name);
    }
    if (query !== undefined) {
      setClauses.push(`query = $${paramIdx++}`);
      params.push(query);
    }
    if (filters !== undefined) {
      setClauses.push(`filters = $${paramIdx++}`);
      params.push(JSON.stringify(filters));
    }
    if (notification_type !== undefined) {
      setClauses.push(`notification_type = $${paramIdx++}`);
      params.push(notification_type);
    }
    if (notification_target !== undefined) {
      setClauses.push(`notification_target = $${paramIdx++}`);
      params.push(notification_target);
    }
    if (is_active !== undefined) {
      setClauses.push(`is_active = $${paramIdx++}`);
      params.push(is_active);
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE feeds SET ${setClauses.join(", ")} WHERE id = $${paramIdx}
                 RETURNING id, name, query, filters, notification_type, notification_target,
                           is_active, last_checked_at, created_at`;

    const pool = getPool();
    const result = await pool.query<FeedRow>(sql, params);
    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    logger.info({ feed_id: id }, "alert_feed_updated");

    return NextResponse.json({ feed: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "alert_feed_update_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `DELETE FROM feeds WHERE id = $1 RETURNING id`,
      [parseInt(id, 10)]
    );
    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    logger.info({ feed_id: parseInt(id, 10) }, "alert_feed_deleted");

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "alert_feed_delete_error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
