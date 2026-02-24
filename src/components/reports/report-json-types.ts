/** report_json v3 스키마 */
export interface ReportJsonV3 {
  meta: { version: number; language: string };
  status_analysis: { content: string };
  executive_summary: { position: string; solutions: [string, string, string] };
  detailed_notes: Array<{ title: string; content: string }>;
}

export const TOC_SECTIONS = [
  { id: "status-analysis", label: "현재 상황 진단" },
  { id: "executive-summary", label: "컨설팅 종합 요약" },
  { id: "detailed-notes", label: "세부 상담 내용" },
] as const;

export function parseReportJson(
  raw: unknown
): ReportJsonV3 | null {
  if (raw == null) return null;
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  const meta = o.meta as ReportJsonV3["meta"] | undefined;
  const status_analysis = o.status_analysis as ReportJsonV3["status_analysis"] | undefined;
  const executive_summary = o.executive_summary as ReportJsonV3["executive_summary"] | undefined;
  const detailed_notes = o.detailed_notes as ReportJsonV3["detailed_notes"] | undefined;
  if (
    !meta ||
    meta.version !== 3 ||
    !status_analysis ||
    typeof status_analysis.content !== "string" ||
    !executive_summary ||
    typeof executive_summary.position !== "string" ||
    !Array.isArray(executive_summary.solutions) ||
    executive_summary.solutions.length !== 3 ||
    !Array.isArray(detailed_notes) ||
    detailed_notes.length < 1 ||
    detailed_notes.length > 5
  ) {
    return null;
  }
  for (const note of detailed_notes) {
    if (!note || typeof note.title !== "string" || typeof note.content !== "string")
      return null;
  }
  return obj as ReportJsonV3;
}
