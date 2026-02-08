"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSttJob = startSttJob;
const process_report_1 = require("./lib/process-report");
/**
 * API에서 호출: 작업을 백그라운드로 시작하고 즉시 반환.
 */
function startSttJob(reportId) {
    setImmediate(() => {
        (0, process_report_1.processReport)(reportId).catch((err) => {
            console.error(`[processReport ${reportId}]`, err);
        });
    });
    return Promise.resolve();
}
