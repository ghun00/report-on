"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TossStyleAlert from "@/components/ui/tossalert";
import { createClient } from "@/lib/supabase/client";
import {
  createReportRow,
  updateReportAfterUpload,
  updateReportAfterNcpUpload,
  updateReportFailed,
  updateReportErrorMessage,
} from "@/lib/supabase/reports";
import { uploadRecordingBlob } from "@/lib/supabase/upload-recording";
import { shouldUseNcpUpload, uploadToNcp } from "@/lib/ncp-upload";
import { saveLocalRecording, deleteRecording, loadRecording } from "@/lib/local-recordings";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { useCurrentUser } from "@/lib/supabase/use-current-user";
import { isKakaoInApp, isIOS } from "@/lib/inapp";
import { Pause, Play, WifiOff, Loader2, ExternalLink } from "lucide-react";

type RecordingState =
  | "recording"
  | "paused"
  | "processing"
  | "upload_failed";

// ─── 애니메이션 바 컴포넌트 ─────────────────────────────────────────────────
function Bars({
  isAnimating,
  isPhaseA,
}: {
  isAnimating: boolean;
  isPhaseA: boolean;
}) {
  const bars = [
    { base: 48 }, { base: 24 }, { base: 40 }, { base: 32 }, { base: 72 },
    { base: 64 }, { base: 28 }, { base: 48 }, { base: 24 },
  ];
  const delays = [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.96];

  return (
    <>
      <div
        className={`flex gap-3 h-[72px] items-center justify-center relative shrink-0 transition-opacity duration-[1.2s] ease-out ${isPhaseA ? "opacity-0" : "opacity-100"}`}
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            className="bg-[#F05705] rounded-full shrink-0 w-2"
            style={{
              height: `${bar.base}px`,
              animation:
                !isPhaseA && isAnimating
                  ? `barWave${i} 1.2s ease-in-out infinite`
                  : "none",
              animationDelay: `${delays[i]}s`,
            }}
          />
        ))}
      </div>
      <style jsx global>{`
        @keyframes barWave0 {
          0%, 100% { height: 48px; }
          50% { height: 24px; }
        }
        @keyframes barWave1 {
          0%, 100% { height: 24px; }
          50% { height: 48px; }
        }
        @keyframes barWave2 {
          0%, 100% { height: 40px; }
          50% { height: 64px; }
        }
        @keyframes barWave3 {
          0%, 100% { height: 32px; }
          50% { height: 56px; }
        }
        @keyframes barWave4 {
          0%, 100% { height: 72px; }
          50% { height: 32px; }
        }
        @keyframes barWave5 {
          0%, 100% { height: 64px; }
          50% { height: 28px; }
        }
        @keyframes barWave6 {
          0%, 100% { height: 28px; }
          50% { height: 48px; }
        }
        @keyframes barWave7 {
          0%, 100% { height: 48px; }
          50% { height: 36px; }
        }
        @keyframes barWave8 {
          0%, 100% { height: 24px; }
          50% { height: 40px; }
        }
        @keyframes pulseCircle {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── 중앙 펄스 (AI 작업 시작 시) ───────────────────────────────────────────
function CenterPulse({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ animation: "fadeIn 0.4s ease-out forwards" }}
    >
      <div
        className="w-4 h-4 rounded-full bg-[#F05705] opacity-90"
        style={{ animation: "pulseCircle 1.2s ease-in-out infinite" }}
      />
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── 타이머 포맷 함수 ──────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ─── 메인 녹음 페이지 ───────────────────────────────────────────────────────
export default function RecordPage() {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { user } = useCurrentUser();
  const showInAppBanner = isKakaoInApp();
  
  const [state, setState] = useState<RecordingState>("recording");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showMicError, setShowMicError] = useState(false);
  const [showShortRecording, setShowShortRecording] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFailedBlobRef = useRef<Blob | null>(null);
  const lastDurationSecRef = useRef<number>(0);

  // ─── 타이머 시작/정지 ─────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // ─── 녹음 시작 ───────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = () => {
        setState("upload_failed");
        setErrorMessage("녹음 중 오류가 발생했습니다.");
      };

      mediaRecorder.start();
      setState("recording");
      startTimer();
    } catch {
      setShowMicError(true);
    }
  }, [startTimer]);

  // ─── 녹음 일시정지 ───────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      setState("paused");
      stopTimer();
    }
  }, [state, stopTimer]);

  // ─── 녹음 재개 ───────────────────────────────────────────────────────────
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      setState("recording");
      startTimer();
    }
  }, [state, startTimer]);

  // ─── 녹음 종료 및 저장 ───────────────────────────────────────────────────
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopTimer();
    });
  }, [stopTimer]);

  // ─── 초기 녹음 시작 ──────────────────────────────────────────────────────
  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startRecording, stopTimer]);

  // ─── 업로드 중 페이지 이탈 방지 (로컬 저장되지만 사용자 안내) ─────────────────
  useEffect(() => {
    if (state !== "processing") return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state]);

  // ─── 취소 핸들러 ──────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (state === "processing" || state === "upload_failed") return;
    setShowCancelConfirm(true);
  }, [state]);

  const handleCancelConfirm = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    router.push("/home");
  }, [router, stopTimer]);

  // ─── 종료 핸들러 ──────────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    if (state === "processing" || state === "upload_failed") return;
    if (elapsedSeconds < 30) {
      setShowShortRecording(true);
      return;
    }
    setShowFinishConfirm(true);
  }, [state, elapsedSeconds]);

  // ─── 업로드 및 저장 ─────────────────────────────────────────────────────
  const runSaveAndFinish = useCallback(
    async (blob: Blob, retryReportId?: string) => {
      lastFailedBlobRef.current = blob;
      lastDurationSecRef.current = elapsedSeconds || lastDurationSecRef.current;
      setErrorMessage(null);
      setState("processing");
      
      const title = "상담 보고서";
      let reportId = retryReportId;

      if (!reportId) {
        const createResult = await createReportRow({
          title,
          durationSec: lastDurationSecRef.current,
          status: "generating",
        });
        if (!createResult.success || !createResult.id) {
          setErrorMessage("보고서 생성에 실패했습니다.");
          setState("upload_failed");
          return;
        }
        reportId = createResult.id;
      }
      setLastReportId(reportId);

      try {
        await saveLocalRecording({
          reportId,
          blob,
          mimeType: blob.type || "audio/webm",
          durationSec: lastDurationSecRef.current,
          title,
          userId: user?.id,
        });
      } catch (err) {
        console.error("[runSaveAndFinish] Local save failed:", err);
        setErrorMessage("로컬 저장에 실패했습니다. 다시 시도해 주세요.");
        setState("upload_failed");
        return;
      }

      const contentType = blob.type?.trim() || "audio/webm";
      const useNcp = shouldUseNcpUpload(blob.size);

      if (useNcp) {
        const ncpResult = await uploadToNcp(reportId, blob, contentType);
        if (!ncpResult.success) {
          console.error("[runSaveAndFinish] NCP upload failed:", ncpResult.error);
          await updateReportFailed(reportId, ncpResult.error ?? "NCP upload failed");
          setErrorMessage(ncpResult.error ?? "업로드에 실패했습니다.");
          setState("upload_failed");
          return;
        }
        const updateResult = await updateReportAfterNcpUpload(
          reportId,
          ncpResult.objectKey!,
          blob.size,
          contentType
        );
        if (!updateResult.success) {
          const errMsg = `audio_path update failed: ${updateResult.error ?? "unknown"}`;
          await updateReportFailed(reportId, errMsg);
          setErrorMessage(updateResult.error ?? "업로드 후 처리에 실패했습니다.");
          setState("upload_failed");
          return;
        }
      } else {
        const supabase = createClient();
        const uploadResult = await uploadRecordingBlob(
          supabase,
          reportId,
          blob,
          lastDurationSecRef.current
        );
        if (!uploadResult.success) {
          const errMsg = `upload failed: ${uploadResult.error ?? "unknown error"}`;
          console.error(`[runSaveAndFinish] ${errMsg}`, uploadResult.errorDetails);
          await updateReportFailed(reportId, errMsg);
          setErrorMessage(uploadResult.error ?? "업로드에 실패했습니다.");
          setState("upload_failed");
          return;
        }
        const updateResult = await updateReportAfterUpload(reportId, uploadResult.path!);
        if (!updateResult.success) {
          const errMsg = `audio_path update failed: ${updateResult.error ?? "unknown"}`;
          await updateReportFailed(reportId, errMsg);
          setErrorMessage(updateResult.error ?? "업로드 후 처리에 실패했습니다.");
          setState("upload_failed");
          return;
        }
      }

      try {
        const res = await fetch("/api/stt/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId }),
        });
        if (!res.ok) {
          await updateReportErrorMessage(
            reportId,
            `worker trigger failed (${res.status})`
          );
        }
      } catch {
        await updateReportErrorMessage(reportId, "worker trigger failed");
      }

      await deleteRecording(reportId);
    },
    [elapsedSeconds, user?.id]
  );

  const handleFinishConfirm = useCallback(() => {
    setShowFinishConfirm(false);
    setState("processing");
    stopTimer();

    (async () => {
      const blob = await stopRecording();
      if (!blob) {
        setState("upload_failed");
        setErrorMessage("녹음 데이터를 가져올 수 없습니다.");
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
      await runSaveAndFinish(blob);
    })();
  }, [stopRecording, stopTimer, runSaveAndFinish]);

  const handleShortRecordingConfirm = useCallback(() => {
    setShowShortRecording(false);
    setState("processing");
    stopTimer();

    (async () => {
      const blob = await stopRecording();
      if (!blob) {
        setState("upload_failed");
        setErrorMessage("녹음 데이터를 가져올 수 없습니다.");
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
      await runSaveAndFinish(blob);
    })();
  }, [stopRecording, stopTimer, runSaveAndFinish]);

  // ─── 업로드 재시도 ─────────────────────────────────────────────────────
  const handleRetrySave = useCallback(async () => {
    let blob = lastFailedBlobRef.current;
    const reportId = lastReportId;
    
    if (!blob && reportId) {
      const local = await loadRecording(reportId);
      if (local) {
        blob = local.blob;
        lastFailedBlobRef.current = blob;
      }
    }
    
    if (!blob) {
      router.push("/home");
      return;
    }
    
    if (!isOnline) {
      setErrorMessage("네트워크에 연결되어 있지 않습니다. 연결 후 다시 시도해주세요.");
      return;
    }
    
    setIsRetrying(true);
    setErrorMessage(null);
    setState("processing");
    
    await new Promise((r) => setTimeout(r, 300));
    await runSaveAndFinish(blob, reportId ?? undefined);
    setIsRetrying(false);
  }, [runSaveAndFinish, router, lastReportId, isOnline]);

  // ─── 중앙 버튼 핸들러 ──────────────────────────────────────────────────────
  const handleCenterButton = useCallback(() => {
    if (state === "recording") {
      pauseRecording();
    } else if (state === "paused") {
      resumeRecording();
    }
  }, [state, pauseRecording, resumeRecording]);

  const getHelperText = () => {
    switch (state) {
      case "recording":
        return "상담이 끝나면 '종료'를 눌러 저장해 주세요.";
      case "paused":
        return "일시정지 상태입니다. 재개하거나 종료해 주세요.";
      default:
        return "";
    }
  };

  const isAnimating = state === "recording";
  const isProcessing = state === "processing";
  const isDisabled = state === "processing" || state === "upload_failed";

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center relative w-full">
      {/* 카카오 인앱브라우저 경고 배너 */}
      {showInAppBanner && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#FFE812] text-[#191919] px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 text-[13px]">
          <p className="text-center">
            카카오 인앱브라우저에서는 긴 녹음/업로드가 불안정할 수 있어요.
            <br className="sm:hidden" />
            Chrome{isIOS() ? "/Safari" : ""}에서 열면 더 안정적이에요.
          </p>
          <a
            href={typeof window !== "undefined" ? window.location.href : ""}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191919] text-white text-[12px] font-semibold hover:bg-[#333] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            외부 브라우저로 열기
          </a>
        </div>
      )}
      
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className={`absolute left-0 right-0 z-50 bg-[#EF4444] text-white text-center py-2 text-[14px] font-medium flex items-center justify-center gap-2 ${showInAppBanner ? "top-14" : "top-0"}`}>
          <WifiOff className="w-4 h-4" />
          네트워크 연결이 불안정합니다
        </div>
      )}
      
      {/* 상단 취소/종료 버튼 (검정 배경 위) */}
      <div
        className={`absolute left-0 right-0 z-40 flex items-center justify-between px-4 lg:px-8 py-4 lg:py-6 ${
          showInAppBanner && !isOnline ? "top-24" : showInAppBanner ? "top-14" : !isOnline ? "top-10" : "top-0"
        }`}
      >
        <button
          onClick={handleCancel}
          disabled={isDisabled}
          className={`px-4 py-2 font-medium transition-colors ${
            isDisabled
              ? "text-gray-600 cursor-not-allowed"
              : "text-[#9395A6] hover:text-white"
          }`}
          aria-label="취소"
        >
          취소
        </button>
        <button
          onClick={handleFinish}
          disabled={isDisabled}
          className={`px-4 py-2 font-semibold transition-colors ${
            isDisabled
              ? "text-gray-600 cursor-not-allowed"
              : "text-[#F05705] hover:text-[#FF6F0F]"
          }`}
          aria-label="종료"
        >
          종료
        </button>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-col items-center justify-center px-4 py-8 w-full max-w-7xl mx-auto relative">
        {/* Upload Failed 전용 오버레이 */}
        {state === "upload_failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <p className="text-[22px] font-bold text-white mb-2">
              업로드에 실패했어요
            </p>
            <p className="text-[15px] text-[#9395A6] mb-4 text-center max-w-[320px]">
              네트워크가 불안정하면 업로드가 끊길 수 있어요.
              <br />녹음은 기기에 저장돼 있어요. 홈에서 업로드를 재개할 수 있어요.
            </p>
            {errorMessage && (
              <p className="text-[13px] text-[#6B7280] mb-6 text-center max-w-[360px] bg-[#1A1A1A] px-4 py-2 rounded-lg font-mono break-all">
                {errorMessage}
              </p>
            )}
            <div className="flex flex-col gap-3 w-full max-w-[320px]">
              <button
                onClick={() => handleRetrySave()}
                disabled={isRetrying}
                className="w-full rounded-xl bg-[#F05705] hover:bg-[#D04A04] disabled:bg-[#4A4A4A] py-3.5 text-[15px] font-semibold text-white transition-colors active:opacity-95 flex items-center justify-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    재시도 중...
                  </>
                ) : (
                  "다시 업로드"
                )}
              </button>
              <button
                onClick={() => router.push("/home")}
                disabled={isRetrying}
                className="w-full rounded-xl bg-transparent hover:bg-[#1A1A1A] py-3 text-[14px] font-medium text-[#9395A6] transition-colors"
              >
                홈으로 가기
              </button>
            </div>
          </div>
        )}

        {/* 녹음/Processing UI */}
        <div className={`flex flex-col items-center justify-center w-full ${state === "upload_failed" ? "invisible" : ""}`}>
          {/* 파형 + 펄스 (processing 시 수축) */}
          <div className="relative mb-8 flex flex-col items-center w-full">
            <div className="mb-8 flex justify-center w-full">
              <Bars isAnimating={isAnimating} isPhaseA={isProcessing} />
            </div>
            <CenterPulse show={isProcessing} />
          </div>

          {/* recording/paused: 타이머 + 일시정지 버튼 */}
          {!isProcessing && (
            <>
              <div className="flex flex-col gap-1 items-center mb-12 w-full">
                <p className="text-[#E4E6F0] text-[24px] font-semibold leading-[1.5]">
                  {state === "recording" ? "녹음중" : state === "paused" ? "일시정지" : ""}
                </p>
                <p className="text-[#F8F8FC] text-[60px] font-semibold leading-[1.5] tabular-nums">
                  {formatTime(elapsedSeconds)}
                </p>
                {getHelperText() && (
                  <p className="text-[#9395A6] text-[14px] leading-[1.5] mt-2 text-center max-w-[320px]">
                    {getHelperText()}
                  </p>
                )}
              </div>

              <div className="w-full flex justify-center">
                <button
                  onClick={handleCenterButton}
                  className="bg-[rgba(240,87,5,0.4)] flex items-center justify-center p-[14px] rounded-full w-20 h-20 transition-transform active:scale-95 hover:bg-[rgba(240,87,5,0.5)]"
                  aria-label={state === "recording" ? "일시정지" : "재개"}
                >
                  {state === "recording" ? (
                    <Pause className="w-6 h-6 text-[#B7B9C9]" strokeWidth={2} />
                  ) : (
                    <Play className="w-6 h-6 text-[#B7B9C9]" strokeWidth={2} fill="#B7B9C9" />
                  )}
                </button>
              </div>
            </>
          )}

          {/* processing: 상담 보고서 생성 안내 + 홈으로 가기 */}
          {isProcessing && (
            <div className="flex flex-col items-center w-full max-w-[320px]">
              <p className="text-[22px] lg:text-[28px] font-bold text-white mb-2 text-center">
                상담 보고서를 만들고 있어요
              </p>
              <p className="text-[15px] lg:text-[18px] text-[#E4E6F0] mb-1 text-center">
                완료되면 알림톡으로 안내드릴게요!
              </p>
              <p className="text-[13px] lg:text-[15px] text-[#9395A6] mb-2 text-center">
                이 화면을 닫아도 생성은 계속 진행돼요.
              </p>
              <p className="text-[12px] text-[#6B7280] mb-8 text-center">
                업로드 완료 전에는 페이지를 닫지 마세요. (녹음은 기기에 저장돼 있어요)
              </p>
              <button
                onClick={() => router.push("/home")}
                className="w-full rounded-xl bg-[#F05705] hover:bg-[#D04A04] py-3.5 text-[15px] font-semibold text-white transition-colors active:opacity-95"
              >
                홈으로 가기
              </button>
            </div>
          )}
        </div>

        {/* Confirm Dialogs (TossStyleAlert 사용) */}
        <TossStyleAlert
          open={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelConfirm}
          title="녹음을 취소할까요?"
          description="지금까지 녹음한 내용은 저장되지 않습니다."
          cancelText="계속 녹음"
          confirmText="취소하고 나가기"
          confirmType="danger"
        />

        <TossStyleAlert
          open={showFinishConfirm}
          onClose={() => setShowFinishConfirm(false)}
          onConfirm={handleFinishConfirm}
          title="상담이 완료되었나요?"
          description="녹음을 저장하고 상담 보고서를 생성할게요."
          cancelText="계속 녹음"
          confirmText="종료하고 저장"
        />

        <TossStyleAlert
          open={showShortRecording}
          onClose={() => setShowShortRecording(false)}
          onConfirm={handleShortRecordingConfirm}
          title="녹음 시간이 너무 짧습니다"
          description="그래도 저장할까요?"
          cancelText="계속 녹음"
          confirmText="저장"
        />

        {/* Error Alerts */}
        <TossStyleAlert
          open={showMicError}
          onClose={() => {
            setShowMicError(false);
            router.push("/home");
          }}
          title="마이크 권한이 필요합니다"
          description="브라우저 또는 시스템 설정에서 마이크 접근을 허용해주세요."
          buttonText="홈으로"
          type="warning"
        />
      </div>
    </div>
  );
}
