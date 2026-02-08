/** reports 테이블 status 컬럼 값 (DB·앱 공통) */
export const REPORT_STATUS = [
  "uploading",
  "generating",
  "done",
  "failed",
] as const;

export type ReportStatus = (typeof REPORT_STATUS)[number];

export function isReportStatus(s: string): s is ReportStatus {
  return REPORT_STATUS.includes(s as ReportStatus);
}
