"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/appshell";
import { X, Square, Pause, Play, RotateCcw, Mic, FileText, User } from "lucide-react";
import Link from "next/link";

export default function TestRecordingPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
        // Simulate audio level
        setAudioLevel(Math.random() * 0.8 + 0.2);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsRecording(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsRecording(false);
    setIsPaused(false);
    setTime(0);
    setAudioLevel(0);
    // TODO: Save recording logic
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <AppShell showBottomNav={false}>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100/50">
          <div className="max-w-[480px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleCancel}
                className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">New Recording</h1>
              <button
                onClick={handleStop}
                className="px-4 py-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-[480px] mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
            {/* Visual Audio Waveform */}
            <div className="relative w-full max-w-[320px]">
              {!isRecording ? (
                <div className="w-full aspect-square rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border-4 border-orange-200 shadow-lg shadow-orange-100">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-xl shadow-orange-300">
                    <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-orange-500" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-square flex items-center justify-center">
                  {/* Pulsing circles */}
                  <div
                    className="absolute w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-20 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  <div
                    className="absolute w-[90%] h-[90%] rounded-full bg-gradient-to-br from-orange-400 to-orange-500 opacity-30 animate-ping"
                    style={{ animationDuration: "2.5s", animationDelay: "0.5s" }}
                  />
                  
                  {/* Audio level visualization */}
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const angle = (i * 360) / 20;
                        const radian = (angle * Math.PI) / 180;
                        const radius = 100;
                        const x = Math.cos(radian) * radius;
                        const y = Math.sin(radian) * radius;
                        const height = 8 + audioLevel * 20 + Math.sin(Date.now() / 200 + i) * 10;
                        return (
                          <div
                            key={i}
                            className="absolute bg-gradient-to-t from-orange-500 to-orange-400 rounded-full"
                            style={{
                              width: "4px",
                              height: `${height}px`,
                              left: `calc(50% + ${x}px)`,
                              top: `calc(50% + ${y}px)`,
                              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                              transformOrigin: "0 0",
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-300 z-10">
                      <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                          {isPaused ? (
                            <Play className="w-6 h-6 text-orange-500" fill="currentColor" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-orange-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Display */}
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-2 font-mono">
                {formatTime(time)}
              </div>
              <p className="text-sm text-gray-500">
                {!isRecording
                  ? "Tap to start recording"
                  : isPaused
                  ? "Recording paused"
                  : "Recording..."}
              </p>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-6">
              {!isRecording ? (
                <button
                  onClick={handleStart}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl shadow-orange-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white" />
                  </div>
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePause}
                    className="w-16 h-16 rounded-2xl bg-white border-2 border-orange-200 text-orange-600 shadow-lg flex items-center justify-center hover:bg-orange-50 active:scale-95 transition-all"
                  >
                    {isPaused ? (
                      <Play className="w-7 h-7" fill="currentColor" />
                    ) : (
                      <Pause className="w-7 h-7" fill="currentColor" />
                    )}
                  </button>
                  <button
                    onClick={handleStop}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl shadow-orange-300 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Square className="w-10 h-10" fill="currentColor" />
                  </button>
                  <button
                    onClick={() => {
                      setTime(0);
                      setAudioLevel(0);
                      setIsPaused(false);
                    }}
                    className="w-16 h-16 rounded-2xl bg-white border-2 border-orange-200 text-orange-600 shadow-lg flex items-center justify-center hover:bg-orange-50 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-7 h-7" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-12 bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
            <h3 className="font-semibold text-gray-900 mb-2">Recording Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>Find a quiet environment for better quality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>Speak clearly and at a moderate pace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>AI will transcribe your voice automatically</span>
              </li>
            </ul>
          </div>

          {/* Bottom Spacing */}
          <div className="h-6" />
        </main>

        {/* Custom Bottom Nav for Test */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-orange-100 z-50 safe-area-inset-bottom">
          <div className="max-w-[480px] mx-auto">
            <div className="flex items-center justify-around px-4 py-3">
              <Link
                href="/test-home"
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-orange-600 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Notes</span>
              </Link>
              <Link
                href="/test-recording"
                className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-300 -translate-y-2 transition-transform hover:scale-105 active:scale-95"
              >
                <Mic className="w-7 h-7" />
              </Link>
              <Link
                href="/test-mypage"
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-orange-600 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </AppShell>
  );
}

