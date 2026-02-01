"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TossStyleAlert from "@/components/ui/tossalert";
import { useReports } from "@/contexts/reports-context";
import { Pause, Play } from "lucide-react";

type RecordingState = "recording" | "paused" | "phaseA" | "aiWorking" | "error";

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
  const { addReport } = useReports();
  const [state, setState] = useState<RecordingState>("recording");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showMicError, setShowMicError] = useState(false);
  const [showShortRecording, setShowShortRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFailedBlobRef = useRef<Blob | null>(null);

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
        setState("error");
      };

      mediaRecorder.start();
      setState("recording");
      startTimer();
    } catch (err) {
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

  // ─── 업로드 (더미) ────────────────────────────────────────────────────────
  const uploadRecording = useCallback(async (blob: Blob): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return `rpt_${Date.now()}`;
  }, []);

  // ─── 보고서 생성 요청 (더미) ─────────────────────────────────────────────
  const requestReportGeneration = useCallback(async (reportId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }, []);

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

  // ─── 취소 핸들러 ──────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    if (state === "phaseA" || state === "aiWorking" || state === "error") return;
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
    if (state === "phaseA" || state === "aiWorking" || state === "error") return;
    if (elapsedSeconds < 30) {
      setShowShortRecording(true);
      return;
    }
    setShowFinishConfirm(true);
  }, [state, elapsedSeconds]);

  const runSaveAndGoToAiWorking = useCallback(
    async (blob: Blob) => {
      lastFailedBlobRef.current = blob;
      const durationStr = formatTime(elapsedSeconds);
      const dateStr = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, ".").trim();
      const title = `상담 보고서 ${dateStr}`;

      try {
        const id = await uploadRecording(blob);
        addReport({
          id,
          title,
          date: dateStr,
          duration: durationStr,
          status: "generating",
        });
        setState("aiWorking");
      } catch {
        setState("error");
      }
    },
    [elapsedSeconds, uploadRecording, addReport]
  );

  const handleFinishConfirm = useCallback(() => {
    setShowFinishConfirm(false);
    setState("phaseA");
    stopTimer();

    (async () => {
      const blob = await stopRecording();
      if (!blob) {
        setState("error");
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
      await runSaveAndGoToAiWorking(blob);
    })();
  }, [stopRecording, stopTimer, runSaveAndGoToAiWorking]);

  const handleShortRecordingConfirm = useCallback(() => {
    setShowShortRecording(false);
    setState("phaseA");
    stopTimer();

    (async () => {
      const blob = await stopRecording();
      if (!blob) {
        setState("error");
        return;
      }
      await new Promise((r) => setTimeout(r, 800));
      await runSaveAndGoToAiWorking(blob);
    })();
  }, [stopRecording, stopTimer, runSaveAndGoToAiWorking]);

  const handleRetrySave = useCallback(() => {
    const blob = lastFailedBlobRef.current;
    if (!blob) {
      router.push("/home");
      return;
    }
    setState("phaseA");
    (async () => {
      await new Promise((r) => setTimeout(r, 600));
      await runSaveAndGoToAiWorking(blob);
    })();
  }, [runSaveAndGoToAiWorking, router]);

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
  const isPhaseA = state === "phaseA";
  const isDisabled =
    state === "phaseA" || state === "aiWorking" || state === "error";

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center relative w-full">
      {/* 상단 취소/종료 버튼 (검정 배경 위) */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 lg:px-8 py-4 lg:py-6">
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
        {/* Error 전용 오버레이 */}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <p className="text-[22px] font-bold text-white mb-2">
              저장에 실패했어요
            </p>
            <p className="text-[15px] text-[#9395A6] mb-8 text-center max-w-[280px]">
              네트워크 상태를 확인하고 다시 시도해 주세요.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[320px]">
              <button
                onClick={handleRetrySave}
                className="w-full rounded-xl bg-[#F05705] hover:bg-[#D04A04] py-3.5 text-[15px] font-semibold text-white transition-colors active:opacity-95"
              >
                다시 시도
              </button>
              <button
                onClick={() => router.push("/home")}
                className="w-full rounded-xl bg-[#F3F4FA] hover:bg-[#E5E7EB] py-3.5 text-[15px] font-semibold text-[#191F28] transition-colors active:opacity-95"
              >
                홈으로 가기
              </button>
            </div>
          </div>
        )}

        {/* 녹음/Phase A/aiWorking UI */}
        <div className={`flex flex-col items-center justify-center w-full ${state === "error" ? "invisible" : ""}`}>
          {/* 파형 + 펄스 (phaseA 시 수축) */}
          <div className="relative mb-8 flex flex-col items-center w-full">
            <div className="mb-8 flex justify-center w-full">
              <Bars isAnimating={isAnimating} isPhaseA={isPhaseA} />
            </div>
            <CenterPulse show={isPhaseA} />
          </div>

          {/* recording/paused: 타이머 + 일시정지 버튼 */}
          {!(state === "phaseA" || state === "aiWorking") && (
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

          {/* phaseA / aiWorking: 파형 하단에 텍스트 + 홈으로 가기 */}
          {(state === "phaseA" || state === "aiWorking") && (
            <div className="flex flex-col items-center w-full max-w-[320px]">
              <p className="text-[22px] lg:text-[28px] font-bold text-white mb-2 text-center">
                상담 보고서를 만들고 있어요
              </p>
              <p className="text-[15px] lg:text-[18px] text-[#E4E6F0] mb-1 text-center">
                완료되면 알림톡으로 안내드릴게요!
              </p>
              <p className="text-[13px] lg:text-[15px] text-[#9395A6] mb-8 text-center">
                이 화면을 닫아도 생성은 계속 진행돼요.
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
