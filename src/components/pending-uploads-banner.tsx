"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";
import { listRecordings, loadRecording, deleteRecording, type LocalRecording } from "@/lib/local-recordings";
import { createClient } from "@/lib/supabase/client";
import { uploadRecordingBlobOnce } from "@/lib/supabase/upload-recording";
import { updateReportAfterUpload, updateReportFailed, updateReportErrorMessage } from "@/lib/supabase/reports";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PendingUploadsBanner() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPendingRecordings = useCallback(async () => {
    try {
      const list = await listRecordings();
      setRecordings(list.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error("[PendingUploadsBanner] Failed to load recordings:", err);
    }
  }, []);

  useEffect(() => {
    loadPendingRecordings();
  }, [loadPendingRecordings]);

  const handleUpload = useCallback(async (reportId: string) => {
    if (!isOnline) {
      setError("네트워크에 연결되어 있지 않습니다.");
      return;
    }

    setIsUploading(true);
    setUploadingId(reportId);
    setError(null);

    try {
      const recording = await loadRecording(reportId);
      if (!recording) {
        setError("녹음을 찾을 수 없습니다.");
        setIsUploading(false);
        setUploadingId(null);
        return;
      }

      const supabase = createClient();
      const uploadResult = await uploadRecordingBlobOnce(
        supabase,
        reportId,
        recording.blob,
        recording.durationSec
      );

      if (!uploadResult.success) {
        const errMsg = `upload failed: ${uploadResult.error ?? "unknown error"}`;
        await updateReportFailed(reportId, errMsg);
        setError(uploadResult.error ?? "업로드에 실패했습니다.");
        setIsUploading(false);
        setUploadingId(null);
        return;
      }

      const updateResult = await updateReportAfterUpload(reportId, uploadResult.path!);
      if (!updateResult.success) {
        await updateReportFailed(reportId, updateResult.error ?? "update failed");
        setError(updateResult.error ?? "업데이트에 실패했습니다.");
        setIsUploading(false);
        setUploadingId(null);
        return;
      }

      try {
        const res = await fetch("/api/stt/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId }),
        });
        if (!res.ok) {
          await updateReportErrorMessage(reportId, `worker trigger failed (${res.status})`);
        }
      } catch {
        await updateReportErrorMessage(reportId, "worker trigger failed");
      }

      await deleteRecording(reportId);
      await loadPendingRecordings();
      
    } catch (err) {
      console.error("[PendingUploadsBanner] Upload failed:", err);
      setError("업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      setUploadingId(null);
    }
  }, [isOnline, loadPendingRecordings]);

  const handleDelete = useCallback(async (reportId: string) => {
    try {
      await deleteRecording(reportId);
      await loadPendingRecordings();
    } catch (err) {
      console.error("[PendingUploadsBanner] Delete failed:", err);
    }
  }, [loadPendingRecordings]);

  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFF4EE] border border-[#F05705]/20 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#F05705]" />
          <span className="text-[15px] font-semibold text-[#353644]">
            업로드되지 않은 녹음 {recordings.length}건이 있어요
          </span>
        </div>
      </div>
      
      {error && (
        <p className="text-[13px] text-red-500 mb-3 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {!isOnline && (
        <p className="text-[13px] text-[#9395A6] mb-3">
          네트워크에 연결되면 업로드할 수 있어요.
        </p>
      )}

      <div className="space-y-2">
        {recordings.map((rec) => (
          <div 
            key={rec.reportId}
            className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#353644] truncate">
                {rec.title || "상담 보고서"}
              </p>
              <p className="text-[12px] text-[#9395A6]">
                {formatDuration(rec.durationSec)} · {formatDate(rec.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={() => handleUpload(rec.reportId)}
                disabled={isUploading || !isOnline}
                className="px-3 py-1.5 rounded-lg bg-[#F05705] hover:bg-[#D04A04] disabled:bg-[#CCCCCC] text-white text-[13px] font-medium transition-colors flex items-center gap-1.5"
              >
                {isUploading && uploadingId === rec.reportId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    업로드 중
                  </>
                ) : (
                  "업로드 재개"
                )}
              </button>
              <button
                onClick={() => handleDelete(rec.reportId)}
                disabled={isUploading && uploadingId === rec.reportId}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-[#9395A6] transition-colors"
                aria-label="삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
