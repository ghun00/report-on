import { NextRequest, NextResponse } from "next/server";

const STT_WORKER_URL = process.env.STT_WORKER_URL ?? "https://report-on.onrender.com";

export async function POST(request: NextRequest) {
  let reportId: string | undefined;
  try {
    const body = await request.json();
    reportId = typeof body?.reportId === "string" ? body.reportId.trim() : undefined;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON or missing reportId" },
      { status: 400 }
    );
  }

  if (!reportId) {
    return NextResponse.json(
      { ok: false, error: "reportId required" },
      { status: 400 }
    );
  }

  try {
    const workerRes = await fetch(`${STT_WORKER_URL}/jobs/start-stt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });

    const contentType = workerRes.headers.get("content-type") ?? "";
    let workerBody: unknown;
    try {
      workerBody = contentType.includes("application/json")
        ? await workerRes.json()
        : await workerRes.text();
    } catch {
      workerBody = await workerRes.text();
    }

    if (!workerRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "worker request failed",
          workerStatus: workerRes.status,
          workerBody,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(workerBody, { status: workerRes.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "worker fetch failed",
        detail: message,
      },
      { status: 502 }
    );
  }
}
