import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export interface PublicReportResponse {
  title: string | null;
  status: string | null;
  report_json: unknown;
  created_at: string | null;
  duration_sec: number | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;

  if (!reportId || typeof reportId !== "string") {
    return NextResponse.json(
      { error: "reportId is required" },
      { status: 400 }
    );
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(reportId)) {
    return NextResponse.json(
      { error: "Invalid reportId format" },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from("reports")
      .select("title, status, report_json, created_at, duration_sec")
      .eq("id", reportId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }
      console.error("[public-report] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch report" },
        { status: 500 }
      );
    }

    const response: PublicReportResponse = {
      title: data.title ?? null,
      status: data.status ?? null,
      report_json: data.report_json ?? null,
      created_at: data.created_at ?? null,
      duration_sec: data.duration_sec ?? null,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[public-report] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
