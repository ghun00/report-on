import type { Metadata } from "next";
import { getAdminClient } from "@/lib/supabase/admin";
import ShareReportClient from "./ShareReportClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getReportTitle(reportId: string): Promise<string | null> {
  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from("reports")
      .select("title")
      .eq("id", reportId)
      .single();
    return data?.title ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: reportId } = await params;
  const title = await getReportTitle(reportId);
  const displayTitle = title || "상담 보고서";

  return {
    title: `${displayTitle} | 레포트온`,
    openGraph: {
      title: `${displayTitle} | 레포트온`,
      description: "AI가 생성한 전문 상담 보고서입니다.",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `${displayTitle} | 레포트온`,
      description: "AI가 생성한 전문 상담 보고서입니다.",
    },
  };
}

export default async function ShareReportPage({ params }: PageProps) {
  const { id: reportId } = await params;
  return <ShareReportClient reportId={reportId} />;
}
