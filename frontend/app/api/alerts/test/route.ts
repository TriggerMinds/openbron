import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notification_type, notification_target } = body;

    if (!notification_type) {
      return NextResponse.json({ error: "notification_type is required" }, { status: 400 });
    }

    if (!notification_target) {
      return NextResponse.json({ error: "notification_target is required" }, { status: 400 });
    }

    logger.info({ notification_type, notification_target }, "test_notification_request");

    const formData = new URLSearchParams();
    formData.set("notification_type", notification_type);
    formData.set("notification_target", notification_target);

    const backendRes = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://backend:8000"}/api/alerts/test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }
    );

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      logger.error({ status: backendRes.status, error: errorText }, "test_notification_backend_error");
      return NextResponse.json(
        { message: `Backend error: ${errorText}` },
        { status: backendRes.status }
      );
    }

    const result = await backendRes.json();
    logger.info({ notification_type }, "test_notification_sent");

    return NextResponse.json({ message: result.message || "Test notification sent successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error({ error: message }, "test_notification_error");
    return NextResponse.json({ message: `Failed to send test notification: ${message}` }, { status: 500 });
  }
}
