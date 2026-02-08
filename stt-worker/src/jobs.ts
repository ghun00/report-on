import { processReport } from "./lib/process-report";

/**
 * API에서 호출: 작업을 백그라운드로 시작하고 즉시 반환.
 */
export function startSttJob(reportId: string): Promise<void> {
  setImmediate(() => {
    processReport(reportId).catch((err) => {
      console.error(`[processReport ${reportId}]`, err);
    });
  });
  return Promise.resolve();
}
